import { KenmonMailer, KenmonSendEmailParams } from 'kenmon'

export class MockMailer extends KenmonMailer {
  async sendEmail({
    from,
    to,
    subject,
    textContent,
    htmlContent,
  }: KenmonSendEmailParams) {
    console.log(`From: ${from}`)
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    if (textContent != null) {
      console.log(`Text:\n${textContent}`)
    }
    if (htmlContent != null) {
      console.log(`HTML:\n${htmlContent}`)
    }
  }
}
