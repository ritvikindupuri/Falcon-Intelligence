
import { GoogleGenAI, Chat, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { Message, ToolCallDetails, MCPServer, MCPTool } from "../types";

const SENSITIVE_TOOLS = ['contain_host'];

export class AgentController {
  private genAI: GoogleGenAI;
  private chat: Chat | null = null;
  private servers: MCPServer[] = [];
  private initialized: Promise<void>;
  private lastResponse: any = null;

  constructor(apiKey: string, servers: MCPServer[]) {
    this.genAI = new GoogleGenAI({ apiKey });
    this.servers = servers;
    this.initialized = this.init();
  }

  private async init() {
    let allFunctionDeclarations: FunctionDeclaration[] = [];

    for (const server of this.servers) {
      const tools: MCPTool[] = await server.listTools();
      const declarations = tools.map(t => ({
        name: t.name,
        description: `[${server.name}] ${t.description}`,
        parameters: this.convertSchemaToGemini(t.inputSchema)
      }));
      allFunctionDeclarations = [...allFunctionDeclarations, ...declarations];
    }

    this.chat = this.genAI.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\nYou are an MCP-native agent. Tools are provided by the following servers: ${this.servers.map(s => s.name).join(', ')}.`,
        tools: [{ functionDeclarations: allFunctionDeclarations }],
        thinkingConfig: { thinkingBudget: 32768 } 
      }
    });
  }

  private convertSchemaToGemini(schema: any): any {
    return {
      type: Type.OBJECT,
      properties: Object.keys(schema.properties || {}).reduce((acc: any, key) => {
        const prop = schema.properties[key];
        acc[key] = {
          type: prop.type?.toUpperCase() === 'INTEGER' ? Type.INTEGER : 
                prop.type?.toUpperCase() === 'NUMBER' ? Type.NUMBER : 
                prop.type?.toUpperCase() === 'BOOLEAN' ? Type.BOOLEAN : 
                prop.type?.toUpperCase() === 'ARRAY' ? Type.ARRAY : Type.STRING,
          description: prop.description,
          ...(prop.enum ? { enum: prop.enum } : {})
        };
        return acc;
      }, {}),
      required: schema.required || []
    };
  }

  async processMessage(userMessage: string | any[], onUpdate: (msg: Message) => void): Promise<void> {
    await this.initialized;
    if (!this.chat) throw new Error("Agent disconnected");

    try {
      let response: GenerateContentResponse = await this.chat.sendMessage({ message: userMessage });
      await this.handleResponse(response, onUpdate);
    } catch (error: any) {
      onUpdate({ id: crypto.randomUUID(), role: 'system', content: `CRITICAL_EXCEPTION: ${error.message}`, timestamp: new Date() });
    }
  }

  private async handleResponse(response: GenerateContentResponse, onUpdate: (msg: Message) => void): Promise<void> {
    this.lastResponse = response;

    if (response.functionCalls?.length) {
      const functionCalls = response.functionCalls;
      const toolDetails: ToolCallDetails[] = functionCalls.map(fc => ({
        id: fc.id,
        functionName: fc.name,
        args: fc.args as Record<string, any>,
        status: SENSITIVE_TOOLS.includes(fc.name) ? 'awaiting_approval' : 'pending'
      }));
      
      const turnId = crypto.randomUUID();
      onUpdate({ id: turnId, role: 'model', content: '', timestamp: new Date(), isThinking: true, toolCalls: toolDetails });

      // If any tool requires approval, we stop here and wait for UI to call resumeWithApproval
      if (toolDetails.some(t => t.status === 'awaiting_approval')) {
        return;
      }

      await this.executeTools(toolDetails, turnId, onUpdate);
    } else {
      onUpdate({
        id: crypto.randomUUID(),
        role: 'model',
        content: response.text || "Investigation complete.",
        timestamp: new Date(),
        isThinking: false
      });
    }
  }

  async resumeWithApproval(turnId: string, approved: boolean, onUpdate: (msg: Message) => void): Promise<void> {
    if (!this.lastResponse || !this.lastResponse.functionCalls) return;

    const functionCalls = this.lastResponse.functionCalls;
    const toolDetails: ToolCallDetails[] = functionCalls.map((fc: any) => ({
      id: fc.id,
      functionName: fc.name,
      args: fc.args as Record<string, any>,
      status: approved ? 'pending' : 'denied'
    }));

    if (!approved) {
      const toolResponses = functionCalls.map((call: any) => ({
        functionResponse: { name: call.name, response: { result: "Action denied by user." }, id: call.id }
      }));
      const nextResponse = await this.chat!.sendMessage({ message: toolResponses });
      await this.handleResponse(nextResponse, onUpdate);
      return;
    }

    await this.executeTools(toolDetails, turnId, onUpdate);
  }

  private async executeTools(toolDetails: ToolCallDetails[], turnId: string, onUpdate: (msg: Message) => void) {
    const toolParts = await Promise.all(
      toolDetails.map(async (detail, index) => {
        const server = this.servers.find(s => s.callTool); 
        const mcpResponse = await server!.callTool(detail.functionName, detail.args);
        
        let parsedResult;
        try { parsedResult = JSON.parse(mcpResponse.content[0].text); } catch { parsedResult = mcpResponse.content[0].text; }

        toolDetails[index].result = parsedResult;
        toolDetails[index].status = mcpResponse.isError ? 'error' : 'success';
        toolDetails[index].serverName = server?.name;

        return {
          functionResponse: { name: detail.functionName, response: { result: parsedResult }, id: detail.id }
        };
      })
    );
    
    onUpdate({ id: turnId, role: 'model', content: '', timestamp: new Date(), isThinking: true, toolCalls: toolDetails });
    const response = await this.chat!.sendMessage({ message: toolParts });
    await this.handleResponse(response, onUpdate);
  }
}
