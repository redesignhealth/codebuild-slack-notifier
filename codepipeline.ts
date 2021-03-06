import { WebClient, MessageAttachment } from '@slack/client';
import {
  Channel,
  MessageResult,
  findMessageForId,
  updateOrAddAttachment,
} from './slack';

/**
 * See https://docs.aws.amazon.com/codepipeline/latest/userguide/detect-state-changes-cloudwatch-events.html
 */
export type CodePipelineState =
  | 'STARTED'
  | 'SUCCEEDED'
  | 'RESUMED'
  | 'FAILED'
  | 'CANCELED'
  | 'SUPERSEDED';

export type CodePipelineStageState =
  | 'STARTED'
  | 'SUCCEEDED'
  | 'RESUMED'
  | 'FAILED'
  | 'CANCELED';

export type CodePipelineActionState =
  | 'STARTED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED';

export interface CodePipelinePiplelineEvent {
  version: string;
  id: string;
  'detail-type': 'CodePipeline Pipeline Execution State Change';
  source: 'aws.codepipeline';
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: {
    pipeline: string;
    version: number;
    state: CodePipelineState;
    'execution-id': string;
  };
}

export interface CodePipelineStageEvent {
  version: string;
  id: string;
  'detail-type': 'CodePipeline Stage Execution State Change';
  source: 'aws.codepipeline';
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: {
    pipeline: string;
    version: number;
    'execution-id': string;
    stage: string;
    state: CodePipelineStageState;
  };
}

export type CodePipelineActionCategory =
  | 'Approval'
  | 'Build'
  | 'Deploy'
  | 'Invoke'
  | 'Source'
  | 'Test';

export interface CodePipelineActionEvent {
  version: string;
  id: string;
  'detail-type': 'CodePipeline Action Execution State Change';
  source: 'aws.codepipeline';
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: {
    pipeline: string;
    version: number;
    'execution-id': string;
    stage: string;
    action: string;
    state: CodePipelineActionState;
    type: {
      owner: 'AWS' | 'Custom' | 'ThirdParty';
      category: CodePipelineActionCategory;
      provider: 'CodeDeploy';
      version: number;
    };
  };
}

export type CodePipelineEvent =
  | CodePipelinePiplelineEvent
  | CodePipelineStageEvent
  | CodePipelineActionEvent;

export const isCodePipelinePiplelineEvent = (
  event: CodePipelineEvent,
): event is CodePipelinePiplelineEvent => {
  return (
    event['detail-type'] === 'CodePipeline Pipeline Execution State Change'
  );
};

export const isCodePipelineStageEvent = (
  event: CodePipelineEvent,
): event is CodePipelineStageEvent => {
  return event['detail-type'] === 'CodePipeline Stage Execution State Change';
};

export const isCodePipelineActionEvent = (
  event: CodePipelineEvent,
): event is CodePipelineActionEvent => {
  return event['detail-type'] === 'CodePipeline Action Execution State Change';
};

const stateColors: {
  [K in
    | CodePipelineState
    | CodePipelineStageState
    | CodePipelineActionState]: string
} = {
  CANCELED: 'danger',
  FAILED: 'danger',
  STARTED: '#439FE0',
  RESUMED: '#439FE0',
  SUCCEEDED: 'good',
  SUPERSEDED: 'warning',
};

const stateText: {
  [K in
    | CodePipelineState
    | CodePipelineStageState
    | CodePipelineActionState]: string
} = {
  CANCELED: ':no_entry: cancelled',
  FAILED: ':x: failed',
  STARTED: ':building_construction: started',
  RESUMED: ':building_construction: resumed',
  SUCCEEDED: ':white_check_mark: succeeded',
  SUPERSEDED: ':x: superseded',
};

// Create Pipeline attachment
export const pipelineAttachment = (
  event: CodePipelinePiplelineEvent,
): MessageAttachment => {
  return {
    fallback: `Pipeline ${event.detail.pipeline} ${event.detail.state}`,
    title: `Pipeline ${event.detail.pipeline}`,
    text: stateText[event.detail.state],
    color: stateColors[event.detail.state],
    footer: event.detail['execution-id'],
  };
};

// Create Stage attachment
export const stageAttachment = (
  event: CodePipelineStageEvent,
): MessageAttachment => {
  return {
    fallback: `Stage ${event.detail.stage} ${event.detail.state}`,
    title: `Stage ${event.detail.stage}`,
    text: stateText[event.detail.state],
    color: stateColors[event.detail.state],
  };
};

// Create Action attachment
export const actionAttachment = (
  event: CodePipelineActionEvent,
): MessageAttachment => {
  return {
    fallback: `Stage ${event.detail.stage} ${event.detail.state}`,
    title: `Stage ${event.detail.stage}`,
    text: `${stateText[event.detail.state]} (${event.detail.action})`,
    color: stateColors[event.detail.state],
  };
};

// Event handler
export const handleCodePipelineEvent = async (
  event: CodePipelineEvent,
  slack: WebClient,
  channel: Channel,
): Promise<MessageResult | void> => {
  const message = await findMessageForId(
    slack,
    channel.id,
    event.detail['execution-id'],
  );

  if (isCodePipelinePiplelineEvent(event)) {
    const attachment = pipelineAttachment(event);
    if (message) {
      return slack.chat.update({
        channel: channel.id,
        attachments: updateOrAddAttachment(
          message.attachments,
          a => a.title === attachment.title,
          attachment,
        ),
        text: '',
        ts: message.ts,
      }) as Promise<MessageResult>;
    }
    return slack.chat.postMessage({
      channel: channel.id,
      attachments: [pipelineAttachment(event)],
      text: '',
    }) as Promise<MessageResult>;
  }

  // Stage
  if (isCodePipelineStageEvent(event)) {
    const attachment = stageAttachment(event);
    if (message) {
      return slack.chat.update({
        channel: channel.id,
        attachments: updateOrAddAttachment(
          message.attachments,
          a => a.title === attachment.title,
          attachment,
        ),
        text: '',
        ts: message.ts,
      }) as Promise<MessageResult>;
    }
    return undefined;
  }

  // Action
  const attachment = actionAttachment(event);
  if (message) {
    return slack.chat.update({
      channel: channel.id,
      attachments: updateOrAddAttachment(
        message.attachments,
        a => a.title === attachment.title,
        attachment,
      ),
      text: '',
      ts: message.ts,
    }) as Promise<MessageResult>;
  }
  return undefined;
};
