# codebuild-slack-notifier

AWS lambda function to send Slack notifications for CodeBuild events

## Install


Create a new app for your slack team with the following scopes:
   channels:history
   channels:read
   channels:write
   channels:write:bot


A valid Slack oauth token needs to be stored as a secure string in the SSM parameter store as `/codebuild-slack-notifier/slack_token`.

`aws ssm put-parameter --name "/codebuild-slack-notifier/slack_token" --value "xoxp-XXXXX" --type SecureString --overwrite`

To configure the channels that will be notified for a particular build:

`aws ssm put-parameter --name "/codebuild-slack-notifier/<YOUR BUILD NAME>_channels" --value "channel1,channel2" --type SecureString --overwrite`


Edit the region in serverless.yml to your region

Then run

```shell
npm install
npm run deploy
```

With AWS credentials that have access to read from SSM and deploy a lambda.
