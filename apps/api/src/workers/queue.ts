import { logger } from "../core/util/logger";
import type { AppEnv } from "../core/env";

// Queue message types
export interface TikTokSyncMessage {
  type: "tiktok_sync";
  data: {
    userId: string;
    username: string;
  };
}

export interface AnalyticsProcessMessage {
  type: "analytics_process";
  data: {
    userId: string;
    username: string;
    period: string;
  };
}

export interface EmailSendMessage {
  type: "email_send";
  data: {
    to: string;
    template: string;
    data: Record<string, unknown>;
  };
}

export type QueueMessage = TikTokSyncMessage | AnalyticsProcessMessage | EmailSendMessage;

export async function handleQueue(batch: MessageBatch<QueueMessage>, env: AppEnv): Promise<void> {
  logger.info("Processing queue batch", { 
    batchSize: batch.messages.length,
    queueName: batch.queue 
  });

  for (const message of batch.messages) {
    try {
      const parsedMessage = JSON.parse(message.body as unknown as string) as QueueMessage;
      
      switch (parsedMessage.type) {
        case "tiktok_sync":
          await handleTikTokSync(parsedMessage.data, env);
          break;
          
        case "analytics_process":
          await handleAnalyticsProcess(parsedMessage.data, env);
          break;
          
        case "email_send":
          await handleEmailSend(parsedMessage.data, env);
          break;
          
        default:
          const unknownType = parsedMessage as { type: string };
          logger.warn("Unknown queue message type", { 
            type: unknownType.type 
          });
      }
      
      // Acknowledge successful processing
      message.ack();
      
    } catch (error) {
      logger.error("Failed to process queue message", { 
        error: error instanceof Error ? error : new Error(String(error)),
        messageId: message.id 
      });
      
      // Retry failed messages (Cloudflare will handle retries)
      message.retry();
    }
  }
}

async function handleTikTokSync(data: TikTokSyncMessage["data"], env: AppEnv): Promise<void> {
  logger.info("Processing TikTok sync", { 
    userId: data.userId,
    username: data.username 
  });
  
  try {
    // TODO: Implement TikTok sync logic
    // await tiktokService.syncContent(data.userId, data.username);
    
    logger.info("TikTok sync completed", { 
      userId: data.userId,
      username: data.username 
    });
    
  } catch (error) {
    logger.error("TikTok sync failed", { 
      error: error instanceof Error ? error : new Error(String(error)),
      userId: data.userId,
      username: data.username 
    });
    throw error; // Re-throw to trigger retry
  }
}

async function handleAnalyticsProcess(data: AnalyticsProcessMessage["data"], env: AppEnv): Promise<void> {
  logger.info("Processing analytics", { 
    userId: data.userId,
    username: data.username,
    period: data.period 
  });
  
  try {
    // TODO: Implement analytics processing logic
    // await analyticsService.processAnalytics(data.userId, data.username, data.period);
    
    logger.info("Analytics processing completed", { 
      userId: data.userId,
      username: data.username 
    });
    
  } catch (error) {
    logger.error("Analytics processing failed", { 
      error: error instanceof Error ? error : new Error(String(error)),
      userId: data.userId,
      username: data.username 
    });
    throw error;
  }
}

async function handleEmailSend(data: EmailSendMessage["data"], env: AppEnv): Promise<void> {
  logger.info("Processing email send", { 
    to: data.to,
    template: data.template 
  });
  
  try {
    // TODO: Implement email sending logic
    // await emailService.sendEmail(data.to, data.template, data.data);
    
    logger.info("Email sent successfully", { 
      to: data.to,
      template: data.template 
    });
    
  } catch (error) {
    logger.error("Email sending failed", { 
      error: error instanceof Error ? error : new Error(String(error)),
      to: data.to,
      template: data.template 
    });
    throw error;
  }
}
