import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/models/StickerTypes";
import { toast } from "@/components/ui/use-toast";

export interface FriendRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: Profile;
  recipient?: Profile;
}

export const getPendingFriendRequestCount = async (): Promise<number> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData || !userData.user) {
      console.error('Erro ao obter usuário atual:', userError);
      return 0;
    }
    
    const currentUserId = userData.user.id;
    console.log('ID do usuário para contagem:', currentUserId);
    
    // Consulta direta por contagem de solicitações pendentes
    const { count, error: countError } = await supabase
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', currentUserId)
      .eq('status', 'pending');
    
    if (countError) {
      console.error('Erro ao contar solicitações pendentes:', countError);
      return 0;
    }
    
    // Faléncia - se a contagem direta falhar, tentamos obter todos os registros e contar
    if (count === null) {
      const { data: requests, error: requestsError } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('recipient_id', currentUserId)
        .eq('status', 'pending');
      
      if (requestsError) {
        console.error('Erro ao buscar solicitações para contagem:', requestsError);
        return 0;
      }
      
      console.log('Contagem (pelo length):', requests?.length || 0);
      return requests?.length || 0;
    }
    
    console.log('Contagem de solicitações pendentes:', count);
    return count || 0;
  } catch (error) {
    console.error('Erro em getPendingFriendRequestCount:', error);
    return 0;
  }
};

export const searchUsers = async (searchTerm: string): Promise<Profile[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(15);
      
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in searchUsers:', error);
    return [];
  }
};

export const sendFriendRequest = async (recipientId: string): Promise<boolean> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData || !userData.user) {
      console.error('Erro ao obter usuário atual:', userError);
      toast({
        title: "Erro",
        description: "Não foi possível identificar o usuário atual.",
        variant: "destructive"
      });
      return false;
    }
    
    const senderId = userData.user.id;
    console.log('Enviando solicitação de amizade de:', senderId, 'para:', recipientId);
    
    // Verificar se o destinatário existe
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipientId)
      .single();
      
    if (recipientError || !recipientProfile) {
      console.error('Destinatário não encontrado:', recipientError);
      toast({
        title: "Usuário não encontrado",
        description: "O usuário destinatário não foi encontrado.",
        variant: "destructive"
      });
      return false;
    }
    
    // Verificar se já existe solicitação entre os usuários (em qualquer direção)
    // Primeira consulta: verificar se o usuário atual enviou solicitação para o destinatário
    const { data: outgoingRequests, error: outgoingError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', senderId)
      .eq('recipient_id', recipientId);
      
    if (outgoingError) {
      console.error('Erro ao verificar solicitações enviadas:', outgoingError);
      return false;
    }
    
    // Segunda consulta: verificar se o destinatário enviou solicitação para o usuário atual
    const { data: incomingRequests, error: incomingError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', recipientId)
      .eq('recipient_id', senderId);
      
    if (incomingError) {
      console.error('Erro ao verificar solicitações recebidas:', incomingError);
      return false;
    }
    
    // Se existir solicitação em qualquer direção, não permitir nova solicitação
    if ((outgoingRequests && outgoingRequests.length > 0) || 
        (incomingRequests && incomingRequests.length > 0)) {
      console.log('Solicitação já existe:', { outgoing: outgoingRequests, incoming: incomingRequests });
      toast({
        title: "Solicitação já existe",
        description: "Já existe uma solicitação de amizade entre vocês.",
        variant: "destructive"
      });
      return false;
    }
    
    // Preparar os dados para inserir a nova solicitação
    const friendRequestData = { 
      sender_id: senderId,
      recipient_id: recipientId,
      status: 'pending'
    };
    
    console.log('Inserindo nova solicitação:', friendRequestData);
    
    // Inserir nova solicitação
    const { data: newRequest, error: insertError } = await supabase
      .from('friend_requests')
      .insert([friendRequestData])
      .select();
      
    if (insertError) {
      console.error('Erro ao enviar solicitação de amizade:', insertError);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação de amizade.",
        variant: "destructive"
      });
      return false;
    }
    
    console.log('Solicitação criada com sucesso:', newRequest);
    
    toast({
      title: "Solicitação enviada",
      description: "Solicitação de amizade enviada com sucesso!"
    });
    
    return true;
  } catch (error) {
    console.error('Error in sendFriendRequest:', error);
    return false;
  }
};

export const getPendingFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    // Obter usuário atual
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData || !userData.user) {
      console.error('Erro ao obter usuário atual:', userError);
      return [];
    }
    
    const currentUserId = userData.user.id;
    console.log('ID do usuário atual (destinatário):', currentUserId);
    
    // Consulta direta por solicitações destinadas ao usuário atual
    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select('id, sender_id, recipient_id, status, created_at')
      .eq('recipient_id', currentUserId)
      .eq('status', 'pending');
    
    if (requestsError) {
      console.error('Erro ao buscar solicitações de amizade:', requestsError);
      return [];
    }
    
    console.log('Solicitações encontradas (direto):', requests);
    
    if (!requests || requests.length === 0) {
      console.log('Nenhuma solicitação pendente encontrada para o usuário:', currentUserId);
      return [];
    }
    
    // Obter informações dos remetentes em uma consulta separada
    const senderIds = requests.map(req => req.sender_id);
    const { data: senders, error: sendersError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', senderIds);
    
    if (sendersError) {
      console.error('Erro ao buscar perfis dos remetentes:', sendersError);
    }
    
    console.log('Perfis dos remetentes encontrados:', senders);
    
    // Combinar dados da solicitação com dados do remetente
    const enrichedRequests = requests.map(request => {
      const sender = senders?.find(s => s.id === request.sender_id);
      return {
        ...request,
        sender: sender || undefined
      };
    });
    
    console.log('Solicitações processadas:', enrichedRequests);
    return enrichedRequests;
  } catch (error) {
    console.error('Erro em getPendingFriendRequests:', error);
    return [];
  }
};

export const respondToFriendRequest = async (requestId: string, accept: boolean): Promise<boolean> => {
  try {
    console.log(`Respondendo à solicitação ${requestId} com: ${accept ? 'aceitar' : 'recusar'}`);
    
    // Primeiro, vamos verificar se a solicitação ainda existe e está pendente
    const { data: requestCheck, error: checkError } = await supabase
      .from('friend_requests')
      .select('id, sender_id, recipient_id, status')
      .eq('id', requestId)
      .single();
      
    if (checkError || !requestCheck) {
      console.error('Erro ao verificar solicitação:', checkError || 'Solicitação não encontrada');
      toast({
        title: "Erro",
        description: "Solicitação não encontrada ou já processada.",
        variant: "destructive"
      });
      return false;
    }
    
    console.log('Solicitação encontrada:', requestCheck);
    
    if (requestCheck.status !== 'pending') {
      toast({
        title: "Solicitação já processada",
        description: `Esta solicitação já foi ${requestCheck.status === 'accepted' ? 'aceita' : 'recusada'}`,
        variant: "destructive"
      });
      return false;
    }
    
    const newStatus = accept ? 'accepted' : 'rejected';
    
    // Atualizar o status da solicitação
    const { data: updatedRequest, error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: newStatus })
      .eq('id', requestId)
      .select();
      
    if (updateError) {
      console.error('Erro ao atualizar solicitação:', updateError);
      toast({
        title: "Erro",
        description: "Não foi possível processar a solicitação.",
        variant: "destructive"
      });
      return false;
    }
    
    console.log('Solicitação atualizada:', updatedRequest);
    
    // Se aceito, criar conexões em ambas as direções
    if (accept) {
      const senderId = requestCheck.sender_id;
      const recipientId = requestCheck.recipient_id;
      
      console.log(`Criando conexões entre: ${senderId} e ${recipientId}`);
      
      // Verificar se as conexões já existem
      const { data: existingConnections1, error: existingError1 } = await supabase
        .from('user_connections')
        .select('*')
        .eq('user_id', recipientId)
        .eq('connected_user_id', senderId);
        
      if (existingError1) {
        console.error('Erro ao verificar conexões existentes:', existingError1);
      } else if (existingConnections1 && existingConnections1.length > 0) {
        console.log('Conexão já existe:', existingConnections1);
        toast({
          title: "Amizade aceita",
          description: "Vocês já são amigos!",
        });
        return true;
      }
      
      // SOLUÇÃO ALTERNATIVA: Criar apenas a conexão que sabemos que funciona
      // devido às restrições de RLS (Row Level Security) do Supabase
      console.log('Criando conexão recipient -> sender (permitida pelo RLS)');
      
      const recipientConnection = { 
        user_id: recipientId, 
        connected_user_id: senderId 
      };
      
      console.log('Dados da conexão:', recipientConnection);
      
      const { data: connection, error: connectionError } = await supabase
        .from('user_connections')
        .insert([recipientConnection])
        .select();
        
      if (connectionError) {
        console.error('Erro ao criar conexão:', connectionError);
        toast({
          title: "Erro ao Conectar",
          description: "Não foi possível criar a conexão entre os usuários.",
          variant: "destructive"
        });
        return false;
      }
      
      console.log('Conexão criada com sucesso:', connection);
      
      // Nota: Não tentamos criar a segunda conexão (sender -> recipient) porque
      // sabemos que viola a política de RLS. No entanto, a conexão unidirecional
      // é suficiente para o nosso caso de uso, já que as consultas procuram em ambas as direções
      
      // Registrar a necessidade de revisar as políticas de RLS para permitir conexões bidirecionais
      console.log('ALERTA: Conexão unidirecional criada. A política de RLS deve ser revisada.');
    }
    
    toast({
      title: accept ? "Amizade aceita" : "Solicitação recusada",
      description: accept 
        ? "Vocês agora são amigos!" 
        : "A solicitação de amizade foi recusada"
    });
    
    return true;
  } catch (error) {
    console.error('Error in respondToFriendRequest:', error);
    return false;
  }
};