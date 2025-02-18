import OpenAI from 'openai';
import type { VideoFeed, Spot } from '../stores/spots';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const ASSISTANT_ID = import.meta.env.VITE_OPENAI_ASSISTANT_ID;

export interface Report {
  spotId: string;
  feedId: string;
  timestamp: Date;
  summary: string;
  details: string;
  recommendations: string[];
  alerts: string[];
}

export class AIService {
  static async analyzeFrame(imageData: string, customInstructions: string): Promise<string> {
    try {
      if (!openai.apiKey) {
        throw new Error('OpenAI API key is missing. Please check your environment configuration.');
      }

      if (!ASSISTANT_ID) {
        throw new Error('OpenAI Assistant ID is missing. Please check your environment configuration.');
      }

      // Create a thread for this analysis
      const thread = await openai.beta.threads.create();

      // Add image and instructions to the thread
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this camera frame according to these instructions: ${customInstructions}`
          },
          {
            type: "image_url",
            image_url: imageData
          }
        ]
      });

      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID
      });

      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      // Get response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const response = messages.data[0]?.content[0];

      if (!response || response.type !== 'text') {
        throw new Error('Invalid assistant response');
      }

      return response.text.value;

    } catch (error) {
      console.error('Error analyzing frame with OpenAI:', error);
      throw error;
    }
  }

  static async generateReport(
    spot: Spot,
    feed: VideoFeed,
    analysisResults: string[]
  ): Promise<Report> {
    try {
      // Create a thread for this report
      const thread = await openai.beta.threads.create();

      // Add analysis data to the thread
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: `
          Space Name: ${spot.name}
          Monitoring Rules:
          - Objects to track: ${spot.aiSettings.objectsToTrack.join(', ')}
          - Events to monitor: ${spot.aiSettings.eventsToMonitor.join(', ')}
          
          Analysis Data:
          ${analysisResults.join('\n\n')}
          
          Custom Instructions: ${spot.assistant.customInstructions}
          
          Please analyze this data and create a comprehensive report including:
          1. A summary of key findings
          2. Detailed analysis of events and patterns
          3. Recommendations for improvement
          4. Any alerts or concerns that need attention
        `
      });

      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID
      });

      // Wait for the run to complete
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantResponse = messages.data[0]?.content[0];

      if (!assistantResponse || assistantResponse.type !== 'text') {
        throw new Error('Invalid assistant response');
      }

      // Parse the response into sections
      const sections = assistantResponse.text.value.split('\n\n');

      return {
        spotId: spot.id,
        feedId: feed.id,
        timestamp: new Date(),
        summary: sections[0] || '',
        details: sections[1] || '',
        recommendations: (sections[2] || '').split('\n'),
        alerts: (sections[3] || '').split('\n')
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
}