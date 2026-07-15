"use server";

export async function getBatchGhlStatus(volunteers: { id: string, numeroLegendario: string | null, telefone: string }[]) {
  try {
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    if (!token || !locationId) {
      console.error("GHL credentials missing in .env");
      return { error: "Erro de configuração." };
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Version": "2021-07-28",
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    const STAGE_MAP: Record<string, { label: string, level: number }> = {
      "dea07a36-bda5-47d5-90f5-aaf419479c30": { label: "Pré inscrição", level: 0 },
      "b3afdae5-3426-4b38-a006-021eab16aada": { label: "Temporária", level: 0 },
      "82f85557-076d-43a3-80be-67bf046ab12b": { label: "Selecionado", level: 1 },
      "c703e3bf-7eaf-4d57-8fe2-b15a5c071d6c": { label: "Aguardando autorização da esposa", level: 1 },
      "1e2d3654-7962-488a-8d7f-96e9e05054b5": { label: "Autorizado pela esposa (Aguardando Pastor)", level: 2 },
      "46987a73-f81f-44a2-a50b-f6acf95b24b3": { label: "Autorizado pelo pastor", level: 3 },
      "47a3d375-25cf-48b2-8286-bc58e62fa570": { label: "Apto para Pagamento", level: 3 },
      "ebb10279-0d49-40ae-bc6d-689cf61e1ba2": { label: "Pago", level: 3 },
      "31dadd78-24b1-4669-97aa-a9b5790915c1": { label: "Não autorizado por esposa ou pastor", level: -1 }
    };

    const results: Record<string, { esposaOk: boolean, pastorOk: boolean, rejected: boolean }> = {};

    const chunkSize = 5;
    for (let i = 0; i < volunteers.length; i += chunkSize) {
      const chunk = volunteers.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (vol) => {
        if (!vol.numeroLegendario || !vol.telefone) {
          results[vol.id] = { esposaOk: false, pastorOk: false, rejected: false };
          return;
        }

        const cleanSearchPhone = vol.telefone.replace(/\D/g, '');
        if (cleanSearchPhone.length < 10) {
          results[vol.id] = { esposaOk: false, pastorOk: false, rejected: false };
          return;
        }

        const searchBody = {
          locationId: locationId,
          page: 1,
          pageLimit: 10,
          query: cleanSearchPhone 
        };

        const contactsRes = await fetch("https://services.leadconnectorhq.com/contacts/search", {
          method: "POST",
          headers,
          body: JSON.stringify(searchBody)
        });

        if (!contactsRes.ok) {
          results[vol.id] = { esposaOk: false, pastorOk: false, rejected: false };
          return;
        }

        const contactsData = await contactsRes.json();
        const contacts = contactsData.contacts || [];

        let foundContact = null;
        for (const contact of contacts) {
          const customFields = contact.customFields || [];
          const legField = customFields.find((cf: any) => cf.id === "cOEzmh2x8NISLLHmmuUE");
          
          if (legField) {
            const fieldVal = String(legField.value).replace(/\s/g, '');
            const searchVal = String(vol.numeroLegendario).replace(/\s/g, '');
            
            if (fieldVal === searchVal) {
              const phone = contact.phone || contact.phoneLowerCase || "";
              const cleanContactPhone = phone.replace(/\D/g, '');
              if (cleanContactPhone.endsWith(cleanSearchPhone)) {
                foundContact = contact;
                break;
              }
            }
          }
        }

        if (!foundContact) {
          results[vol.id] = { esposaOk: false, pastorOk: false, rejected: false };
          return;
        }

        const oppRes = await fetch(`https://services.leadconnectorhq.com/opportunities/search?location_id=${locationId}&contact_id=${foundContact.id}`, {
          method: "GET",
          headers
        });

        if (!oppRes.ok) {
          results[vol.id] = { esposaOk: false, pastorOk: false, rejected: false };
          return;
        }

        const oppData = await oppRes.json();
        const opportunities = oppData.opportunities || [];
        const servoOpp = opportunities.find((op: any) => op.pipelineId === "zyOejGSdJO0WkdvS4SqT"); 

        if (!servoOpp) {
          results[vol.id] = { esposaOk: false, pastorOk: false, rejected: false };
          return;
        }

        const stageInfo = STAGE_MAP[servoOpp.pipelineStageId] || { level: 0 };
        const level = stageInfo.level;

        results[vol.id] = {
          esposaOk: level >= 2,
          pastorOk: level >= 3,
          rejected: level === -1
        };
      });

      await Promise.all(chunkPromises);
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Batch check error:", error);
    return { error: "Failed to batch check." };
  }
}
