"use server";

export async function checkGhlStatus(legendarioId: string, fullPhone: string) {
  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token || !locationId) {
      console.error("GHL credentials missing in .env");
      return { error: "Erro de configuração interna do servidor." };
    }

    const cleanSearchPhone = fullPhone.replace(/\D/g, '');

    if (!legendarioId || !cleanSearchPhone || cleanSearchPhone.length < 10) {
      return { error: "Por favor, preencha o número do legendário e o telefone completo corretamente." };
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Version": "2021-07-28",
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    // 1. Buscar o contato. 
    // Vamos buscar pelo telefone completo na query geral
    const searchBody = {
      locationId: locationId,
      page: 1,
      pageLimit: 20,
      query: cleanSearchPhone 
    };

    const contactsRes = await fetch("https://services.leadconnectorhq.com/contacts/search", {
      method: "POST",
      headers,
      body: JSON.stringify(searchBody)
    });

    if (!contactsRes.ok) {
      console.error("Erro ao buscar contato", await contactsRes.text());
      return { error: "Erro ao comunicar com o CRM." };
    }

    const contactsData = await contactsRes.json();
    const contacts = contactsData.contacts || [];

    // Filtrar localmente para ter certeza que bate o Custom Field e o Telefone
    let foundContact = null;

    for (const contact of contacts) {
      const customFields = contact.customFields || [];
      const legField = customFields.find((cf: any) => cf.id === "cOEzmh2x8NISLLHmmuUE");
      
      if (legField) {
        // Remover todos os espaços para comparação
        const fieldVal = String(legField.value).replace(/\s/g, '');
        const searchVal = String(legendarioId).replace(/\s/g, '');
        
        if (fieldVal === searchVal) {
          const phone = contact.phone || contact.phoneLowerCase || "";
          const cleanContactPhone = phone.replace(/\D/g, '');
          
          // endsWith ignora se o GHL salvou com +55 na frente
          if (cleanContactPhone.endsWith(cleanSearchPhone)) {
            foundContact = contact;
            break;
          }
        }
      }
    }

    if (!foundContact) {
      return { error: "Nenhum cadastro encontrado com esses dados ou telefone incorreto." };
    }

    // 2. Buscar as oportunidades desse contato
    const oppsRes = await fetch(`https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&contact_id=${foundContact.id}`, {
      method: "GET",
      headers,
    });

    if (!oppsRes.ok) {
      console.error("Erro ao buscar oportunidade", await oppsRes.text());
      return { error: "Erro ao buscar status do funil." };
    }

    const oppsData = await oppsRes.json();
    const opportunities = oppsData.opportunities || [];

    const TARGET_PIPELINE_ID = "zyOejGSdJO0WkdvS4SqT";
    const servoOpp = opportunities.find((opp: any) => opp.pipelineId === TARGET_PIPELINE_ID);

    if (!servoOpp) {
      return { error: "Você ainda não possui uma inscrição ativa no funil Servos-1870." };
    }

    const STAGE_MAP: Record<string, { label: string, isPaymentReady?: boolean, level: number }> = {
      "dea07a36-bda5-47d5-90f5-aaf419479c30": { label: "Pré inscrição", level: 0 },
      "b3afdae5-3426-4b38-a006-021eab16aada": { label: "Temporária", level: 0 },
      "82f85557-076d-43a3-80be-67bf046ab12b": { label: "Selecionado", level: 1 },
      "c703e3bf-7eaf-4d57-8fe2-b15a5c071d6c": { label: "Aguardando autorização da esposa", level: 1 },
      "1e2d3654-7962-488a-8d7f-96e9e05054b5": { label: "Autorizado pela esposa (Aguardando Pastor)", level: 2 },
      "46987a73-f81f-44a2-a50b-f6acf95b24b3": { label: "Autorizado pelo pastor", isPaymentReady: true, level: 3 },
      "47a3d375-25cf-48b2-8286-bc58e62fa570": { label: "Apto para Pagamento", isPaymentReady: true, level: 3 },
      "ebb10279-0d49-40ae-bc6d-689cf61e1ba2": { label: "Pago", level: 3 },
      "31dadd78-24b1-4669-97aa-a9b5790915c1": { label: "Não autorizado por esposa ou pastor", level: -1 }
    };

    const stageInfo = STAGE_MAP[servoOpp.pipelineStageId] || { label: "Status desconhecido", level: 0 };
    const level = stageInfo.level;

    const timeline: { name: string, status: "ok" | "pending" | "rejected" }[] = [
      {
        name: "Selecionado pelo Coordenador",
        status: level >= 1 ? "ok" : level === -1 ? "rejected" : "pending"
      },
      {
        name: "Autorizado pela Esposa",
        status: level >= 2 ? "ok" : level === -1 ? "rejected" : "pending"
      },
      {
        name: "Autorizado pelo Pastor",
        status: level >= 3 ? "ok" : level === -1 ? "rejected" : "pending"
      }
    ];

    return {
      success: true,
      data: {
        name: foundContact.firstName || foundContact.name || "Legendário",
        stageName: stageInfo.label,
        isPaymentReady: !!stageInfo.isPaymentReady,
        timeline
      }
    };

  } catch (error) {
    console.error("Exception in checkGhlStatus:", error);
    return { error: "Erro interno no servidor." };
  }
}
