import { EventBridge } from "aws-sdk";

interface SchedulerParams {
  name: string;
  time: Date;
  lambdaArn: string;
  input: any;
}

export class Scheduler {
  private readonly eb: EventBridge;

  constructor() {
    this.eb = new EventBridge();
  }

  /**
   * Schedules event to run certain lambda at certain time
   * @param {SchedulerParams} params Scheduler options.
   */
  async raiseLambdaAtTime(params: SchedulerParams): Promise<void> {
    const ruleName = `rule-${params.name}`;

    await this.eb
      .putRule({
        Name: ruleName,
        ScheduleExpression: `cron(${Scheduler.buildCron(params.time)})`,
        State: "ENABLED",
      })
      .promise();

    await this.eb
      .putTargets({
        Rule: ruleName,
        Targets: [
          {
            Id: `target-${params.name}`,
            Arn: params.lambdaArn,
            Input: JSON.stringify({
              ruleName,
              input: params.input,
            }),
          },
        ],
      })
      .promise();
  }

  /**
   * Deletes a rule and attached targets.
   * @param {String} ruleName A rule name.
   */
  async kill(ruleName: string) {
    const { Targets } = await this.eb
      .listTargetsByRule({ Rule: ruleName })
      .promise();

    const { FailedEntries, FailedEntryCount } = await this.eb
      .removeTargets({
        Rule: ruleName,
        Ids: Targets!.map(({ Id }) => Id),
      })
      .promise();

    if (FailedEntryCount) {
      console.log("Rule targets removing failed:", { FailedEntries });
    }

    await this.eb
      .deleteRule({
        Name: ruleName,
      })
      .promise();
  }

  private static buildCron(time: Date) {
    return `${time.getMinutes()} ${time.getHours()} ${time.getDate()} ${
      time.getMonth() + 1
    } ? ${time.getFullYear()}`;
  }
}

export default new Scheduler();
