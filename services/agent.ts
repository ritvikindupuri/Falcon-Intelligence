import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { TOOLS, SYSTEM_INSTRUCTION } from "../constants";
import { AppConfig, Message, ToolCallDetails } from "../types";
import { CrowdStrikeService } from "./crowdstrikeService";

export class AgentController {
  private genAI: GoogleGenAI;
  private chat: Chat;
  public csService: CrowdStrikeService;

  constructor(apiKey: string, config: AppConfig) {
    this.genAI = new GoogleGenAI({ apiKey });
    this.csService = new CrowdStrikeService(config);
    
    // Using gemini-3-pro-preview with Deep Thinking enabled for SOC Forensic Analysis
    this.chat = this.genAI.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: TOOLS }],
        // Enabling Thinking Budget for maximum reasoning depth on security telemetry
        thinkingConfig: { thinkingBudget: 32768 } 
      }
    });
  }

  async processMessage(userMessage: string, onUpdate: (msg: Message) => void): Promise<void> {
    try {
      // Send user message and await response
      let response = await this.chat.sendMessage({ message: userMessage });
      
      // Handle tool calls recursively if the model requests them
      while (response.functionCalls && response.functionCalls.length > 0) {
        const functionCalls = response.functionCalls;
        
        const toolDetails: ToolCallDetails[] = functionCalls.map(fc => ({
          functionName: fc.name,
          args: fc.args as Record<string, any>,
          status: 'pending'
        }));
        
        const tempId = crypto.randomUUID();
        
        // Update UI to show thinking/tool-use state
        onUpdate({
            id: tempId,
            role: 'model',
            content: '', 
            timestamp: new Date(),
            isThinking: true,
            toolCalls: toolDetails
        });

        const toolParts = await Promise.all(
            functionCalls.map(async (call, index) => {
                let result;
                try {
                    switch (call.name) {
                        case 'get_statistics':
                            result = await this.csService.get_statistics();
                            break;
                        case 'list_incidents':
                            result = await this.csService.list_incidents(call.args as any);
                            break;
                        case 'get_device_details':
                            result = await this.csService.get_device_details(call.args as any);
                            break;
                        case 'contain_host':
                            result = await this.csService.contain_host(call.args as any);
                            break;
                        case 'lift_containment':
                            result = await this.csService.lift_containment(call.args as any);
                            break;
                        case 'get_detections':
                            result = await this.csService.get_detections(call.args as any);
                            break;
                        default:
                            result = { error: 'Unknown forensic tool' };
                    }
                } catch (e: any) {
                    result = { error: e.message };
                }
                
                toolDetails[index].result = result;
                toolDetails[index].status = result.error ? 'error' : 'success';

                return {
                    functionResponse: {
                        name: call.name,
                        response: { result: result },
                        id: call.id
                    }
                };
            })
        );
        
        // Update UI with tool results
        onUpdate({
            id: tempId,
            role: 'model',
            content: '', 
            timestamp: new Date(),
            isThinking: true,
            toolCalls: toolDetails
        });

        // Feed results back to the model for final synthesis
        response = await this.chat.sendMessage({ message: toolParts });
      }

      // Final model response
      onUpdate({
        id: crypto.randomUUID(),
        role: 'model',
        content: response.text || "Diagnostic output generated.",
        timestamp: new Date(),
        isThinking: false
      });

    } catch (error: any) {
      console.error("Agent Logic Failure:", error);
      onUpdate({
        id: crypto.randomUUID(),
        role: 'system',
        content: `LOGIC_FAIL: ${error.message || 'FIC_CORE_UNSTABLE'}`,
        timestamp: new Date(),
        isThinking: false
      });
    }
  }
}