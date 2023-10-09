import { EventBridgeEvent, Context } from "aws-lambda";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import scheduler from "../../scheduler";
import DynamoDBLockRepo from "../../storage/dynamodb-lock-repo";
import * as env from "env-var";
import { app, expressReceiver, lockBot, prefix, url } from "../slack/infra";

const documentClient = new DocumentClient();

const handler = async (event: EventBridgeEvent<string, any>, context: Context) => {
  console.log(event, context);

  const { ruleName, input } = event.detail;
  const { resource, channel, team } = input;

  const lockRepo = new DynamoDBLockRepo(
    documentClient,
    env.get("RESOURCES_TABLE_NAME").required().asString()
  );

  const lockOwner = await lockRepo.getOwner(resource, channel, team);
  if (!lockOwner) {
    return {
      message: `\`${resource}\` is already unlocked 🔓`,
      destination: "user",
    };
  }

  await lockRepo.delete(resource, channel, team);
  return {
    message: `<@${user}> has unlocked \`${resource}\` 🔓`,
    destination: "channel",
  };

  return scheduler.kill(ruleName);
};
exports.handler = handler;
