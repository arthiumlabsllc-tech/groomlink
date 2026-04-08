declare module 'africastalking' {
  interface SMSOptions {
    to: string[];
    message: string;
    from?: string;
  }

  interface SMSResponse {
    SMSMessageData: {
      Message: string;
      Recipients: Array<{
        statusCode: number;
        number: string;
        status: string;
        cost: string;
        messageId: string;
      }>;
    };
  }

  interface SMSService {
    send(options: SMSOptions): Promise<SMSResponse>;
  }

  interface AfricasTalkingInstance {
    SMS: SMSService;
  }

  interface AfricasTalkingConfig {
    apiKey: string;
    username: string;
  }

  function AfricasTalking(config: AfricasTalkingConfig): AfricasTalkingInstance;

  export = AfricasTalking;
}
