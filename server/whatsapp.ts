/**
 * WhatsApp Notification Service
 * 
 * Configurar variáveis de ambiente:
 * - WHATSAPP_API_URL: URL da API (Evolution API, Z-API, etc.)
 * - WHATSAPP_API_TOKEN: Token de autenticação
 * - WHATSAPP_INSTANCE: Nome da instância (se aplicável)
 * - WHATSAPP_ENABLED: "true" para ativar notificações
 */

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || "";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || "";
const WHATSAPP_INSTANCE = process.env.WHATSAPP_INSTANCE || "default";
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === "true";

function cleanPhone(phone: string): string {
  // Remove everything except digits
  const digits = phone.replace(/\D/g, "");
  // Ensure it starts with country code (55 for Brazil)
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  if (!WHATSAPP_ENABLED) {
    console.log(`[WhatsApp] Desativado. Mensagem para ${phone}: ${message.slice(0, 50)}...`);
    return { success: false, error: "WhatsApp notifications disabled" };
  }

  if (!WHATSAPP_API_URL || !WHATSAPP_API_TOKEN) {
    console.warn("[WhatsApp] API_URL ou API_TOKEN não configurados");
    return { success: false, error: "WhatsApp not configured" };
  }

  const cleanedPhone = cleanPhone(phone);

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: WHATSAPP_API_TOKEN,
      },
      body: JSON.stringify({
        number: cleanedPhone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp] Erro ao enviar: ${response.status} - ${errorText}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    console.log(`[WhatsApp] Mensagem enviada para ${cleanedPhone}`);
    return { success: true };
  } catch (error) {
    console.error("[WhatsApp] Erro:", error);
    return { success: false, error: String(error) };
  }
}

// ============ NOTIFICATION TEMPLATES ============

export async function notifyTaskCreated(
  phone: string,
  assigneeName: string,
  taskTitle: string,
  priority: string,
  dueDate?: number,
): Promise<{ success: boolean; error?: string }> {
  const priorityLabels: Record<string, string> = {
    low: "🟢 Baixa",
    medium: "🟡 Média",
    high: "🟠 Alta",
    urgent: "🔴 Urgente",
  };

  const dueDateStr = dueDate
    ? `\n📅 Prazo: ${new Date(dueDate).toLocaleDateString("pt-BR")}`
    : "";

  const message = `📋 *Nova Tarefa Atribuída*

Olá, ${assigneeName}!

Você recebeu uma nova tarefa:
*${taskTitle}*

Prioridade: ${priorityLabels[priority] ?? priority}${dueDateStr}

Acesse o TaskFlow para mais detalhes.`;

  return sendWhatsAppMessage(phone, message);
}

export async function notifyStatusChanged(
  phone: string,
  assigneeName: string,
  taskTitle: string,
  newStatus: string,
  changedByName: string,
): Promise<{ success: boolean; error?: string }> {
  const statusLabels: Record<string, string> = {
    pending: "⏳ Pendente",
    in_progress: "🔄 Em Andamento",
    completed: "✅ Concluída",
  };

  const message = `🔔 *Status da Tarefa Atualizado*

Olá, ${assigneeName}!

A tarefa *${taskTitle}* foi alterada para:
${statusLabels[newStatus] ?? newStatus}

Alterado por: ${changedByName}`;

  return sendWhatsAppMessage(phone, message);
}

export async function notifyTaskDueSoon(
  phone: string,
  assigneeName: string,
  taskTitle: string,
  dueDate: number,
): Promise<{ success: boolean; error?: string }> {
  const message = `⏰ *Prazo Próximo!*

Olá, ${assigneeName}!

A tarefa *${taskTitle}* vence em breve:
📅 ${new Date(dueDate).toLocaleDateString("pt-BR")} às ${new Date(dueDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}

Acesse o TaskFlow para atualizar o status.`;

  return sendWhatsAppMessage(phone, message);
}

export async function notifyTaskOverdue(
  phone: string,
  assigneeName: string,
  taskTitle: string,
  dueDate: number,
): Promise<{ success: boolean; error?: string }> {
  const message = `🚨 *Tarefa Atrasada!*

Olá, ${assigneeName}!

A tarefa *${taskTitle}* está atrasada!
📅 Prazo era: ${new Date(dueDate).toLocaleDateString("pt-BR")}

Por favor, atualize o status no TaskFlow.`;

  return sendWhatsAppMessage(phone, message);
}
