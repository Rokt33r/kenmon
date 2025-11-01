import {
  Body,
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses'
import { KenmonMailer, KenmonSendEmailParams } from '../../../../../src/types'

interface KenmonAWSSESMailerConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export class KenmonSESMailer extends KenmonMailer {
  client: SESClient

  constructor(config: KenmonAWSSESMailerConfig) {
    super()
    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }

  async sendEmail({
    from,
    to,
    subject,
    textContent,
    htmlContent,
  }: KenmonSendEmailParams) {
    const body: Body = {}
    if (textContent != null) {
      body.Text = {
        Data: textContent,
      }
    }
    if (htmlContent != null) {
      body.Html = {
        Data: htmlContent,
      }
    }

    const data: SendEmailCommandInput = {
      Source: from,
      Destination: {
        ToAddresses: Array.isArray(to) ? to : [to],
      },
      Message: {
        Subject: { Data: subject },
        Body: body,
      },
    }

    await this.client.send(new SendEmailCommand(data))
  }
}
