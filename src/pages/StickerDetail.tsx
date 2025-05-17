import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { getStickersByUserId, updateSticker, Sticker, deleteSticker } from "@/models/StickerModel";
import { ArrowLeft, Camera, Trash2, Image, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

// Definindo as figurinhas especiais
const BRONZE_STICKERS = [10, 22, 34, 46, 58, 70, 82, 94, 102, 114, 126, 138, 150, 162];
const SILVER_STICKERS = [11, 23, 35, 47, 59, 71, 83, 95, 103, 115, 127, 139, 151, 163];
const GOLD_STICKERS = [12, 24, 36, 48, 60, 72, 84, 96, 104, 116, 128, 140, 152, 164];

// Definição das categorias das figurinhas
const STICKER_CATEGORIES = {
  "Fotografias": [1, 12],
  "Pinturas": [13, 60],
  "Esculturas e instalações": [61, 72],
  "Obras literárias": [73, 96],
  "Distopias": [97, 104],
  "Poemas": [105, 116],
  "Músicas": [117, 128],
  "Filmes": [129, 140],
  "Clássicos infantis": [141, 152],
  "Teóricos": [153, 164],
  "Slogans": [165, 184]
};

const getStickerType = (id: number) => {
  if (BRONZE_STICKERS.includes(id)) return 'bronze';
  if (SILVER_STICKERS.includes(id)) return 'silver';
  if (GOLD_STICKERS.includes(id)) return 'gold';
  return 'regular';
};

const getStickerCategory = (id: number) => {
  for (const [category, range] of Object.entries(STICKER_CATEGORIES)) {
    if (id >= range[0] && id <= range[1]) {
      return category;
    }
  }
  return "Sem categoria";
};

const StickerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const stickerId = parseInt(id || "0");
  const { currentUser } = useAuth();
  const [sticker, setSticker] = useState<Sticker | null>(null);
  const [notes, setNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteStickerDialog, setShowDeleteStickerDialog] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSticker() {
      if (currentUser && stickerId) {
        const userStickers = await getStickersByUserId(currentUser.id);
        const foundSticker = userStickers.find(s => s.id === stickerId);
        
        if (foundSticker) {
          setSticker(foundSticker);
          setNotes(foundSticker.notes || "");
          // Removido repeatedCount
        } else {
          // Create a new sticker if not found
          const newSticker: Sticker = {
            id: stickerId,
            collected: false,
            quantity: 0
          };
          setSticker(newSticker);
        }
      }
    }
    
    loadSticker();
  }, [currentUser, stickerId]);

  const handleCollectedToggle = async () => {
    if (!sticker || !currentUser) return;
    
    const updatedSticker: Sticker = {
      ...sticker,
      collected: !sticker.collected,
      dateCollected: !sticker.collected ? new Date().toISOString() : undefined,
      // When marking as collected, set quantity to 1 if it's not already set
      quantity: !sticker.collected ? 1 : sticker.quantity
    };
    
    const success = await updateSticker(currentUser.id, updatedSticker);
    if (success) {
      setSticker(updatedSticker);
      
      toast({
        title: updatedSticker.collected ? "Figurinha coletada!" : "Figurinha removida",
        description: updatedSticker.collected 
          ? `Figurinha #${sticker.id} marcada como coletada` 
          : `Figurinha #${sticker.id} marcada como não coletada`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o status da figurinha."
      });
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleSaveNotes = async () => {
    if (!sticker || !currentUser) return;
    
    const updatedSticker: Sticker = {
      ...sticker,
      notes
    };
    
    const success = await updateSticker(currentUser.id, updatedSticker);
    if (success) {
      setSticker(updatedSticker);
      
      toast({
        title: "Notas salvas",
        description: "As anotações sobre esta figurinha foram salvas."
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as anotações."
      });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sticker || !currentUser) return;
    
    try {
      setIsUploading(true);
      
      // Convert image to base64 data URL usando FileReader
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target || !event.target.result) {
          toast({
            variant: "destructive",
            title: "Erro ao processar imagem",
            description: "Não foi possível processar a imagem selecionada."
          });
          setIsUploading(false);
          return;
        }
        
        const imageDataUrl = event.target.result.toString();
        
        // Validar se é uma imagem válida
        if (!imageDataUrl.startsWith('data:image/')) {
          toast({
            variant: "destructive",
            title: "Formato inválido",
            description: "Por favor, selecione uma imagem válida."
          });
          setIsUploading(false);
          return;
        }
        
        // Update sticker with base64 image data
        const updatedSticker: Sticker = {
          ...sticker,
          photoUrl: imageDataUrl
        };
        
        const success = await updateSticker(currentUser.id, updatedSticker);
        if (success) {
          setSticker(updatedSticker);
          
          toast({
            title: "Foto adicionada",
            description: "A foto da figurinha foi salva com sucesso!"
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível salvar a foto da figurinha."
          });
        }
        setIsUploading(false);
      };
      
      reader.onerror = () => {
        toast({
          variant: "destructive",
          title: "Erro ao ler arquivo",
          description: "Ocorreu um erro ao ler o arquivo de imagem."
        });
        setIsUploading(false);
      };
      
      // Iniciar a leitura do arquivo como Data URL (base64)
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao fazer o upload da foto."
      });
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!sticker || !currentUser) return;
    
    try {
      // Update sticker without photo URL
      const updatedSticker: Sticker = {
        ...sticker,
        photoUrl: undefined
      };
      
      const success = await updateSticker(currentUser.id, updatedSticker);
      if (success) {
        setSticker(updatedSticker);
        
        toast({
          title: "Foto removida",
          description: "A foto da figurinha foi removida."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível remover a foto."
        });
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao remover a foto."
      });
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteSticker = async () => {
    if (!sticker || !currentUser) return;
    
    try {
      const success = await deleteSticker(currentUser.id, sticker.id);
      if (success) {
        toast({
          title: "Figurinha removida",
          description: "A figurinha foi removida com sucesso."
        });
        navigate('/');
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível remover a figurinha."
        });
      }
    } catch (error) {
      console.error('Error deleting sticker:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao remover a figurinha."
      });
    } finally {
      setShowDeleteStickerDialog(false);
    }
  };

  const handleViewPhoto = () => {
    if (sticker?.photoUrl) {
      setPhotoPreview(sticker.photoUrl);
    }
  };

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (!sticker || !currentUser || newQuantity < 1) return;
    
    setIsUpdatingQuantity(true);
    
    const updatedSticker: Sticker = {
      ...sticker,
      quantity: newQuantity
    };
    
    const success = await updateSticker(currentUser.id, updatedSticker);
    
    if (success) {
      setSticker(updatedSticker);
      
      toast({
        title: "Quantidade atualizada",
        description: `Agora você tem ${newQuantity} exemplar${newQuantity !== 1 ? 'es' : ''} desta figurinha.`
      });
    } else {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a quantidade da figurinha."
      });
    }
    
    setIsUpdatingQuantity(false);
  };

  if (!sticker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-sticker-purple-dark">Carregando...</div>
      </div>
    );
  }

  // Determinar o tipo e a categoria da figurinha atual
  const stickerType = getStickerType(sticker.id);
  const stickerCategory = getStickerCategory(sticker.id);
  
  // Definir estilos baseados no tipo da figurinha
  let headerColor = "bg-white";
  let medalIcon = null;
  
  if (stickerType === 'bronze') {
    headerColor = sticker.collected ? "bg-amber-100" : "bg-white";
    medalIcon = "🥉";
  } else if (stickerType === 'silver') {
    headerColor = sticker.collected ? "bg-gray-100" : "bg-white";
    medalIcon = "🥈";
  } else if (stickerType === 'gold') {
    headerColor = sticker.collected ? "bg-yellow-100" : "bg-white";
    medalIcon = "🥇";
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className={`${headerColor} shadow-sm sticky top-0 z-10`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="mr-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center">
                Figurinha #{sticker.id} {medalIcon && <span className="ml-2 text-lg">{medalIcon}</span>}
              </h1>
              <p className="text-xs text-gray-500">{stickerCategory}</p>
            </div>
          </div>
          
          {sticker.collected && (
            <Dialog open={showDeleteStickerDialog} onOpenChange={setShowDeleteStickerDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-500">
                  <Trash2 size={18} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remover figurinha</DialogTitle>
                  <DialogDescription>
                    Tem certeza que deseja remover esta figurinha? Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteStickerDialog(false)}>Cancelar</Button>
                  <Button variant="destructive" onClick={handleDeleteSticker}>Remover</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Sticker Status Card */}
        <Card className={`mb-6 ${stickerType === 'bronze' && sticker.collected ? 'border-amber-500' : 
                               stickerType === 'silver' && sticker.collected ? 'border-gray-400' : 
                               stickerType === 'gold' && sticker.collected ? 'border-yellow-500' : ''}`}>
          <CardHeader>
            <CardTitle className="text-lg flex justify-between items-center">
              Status
              <span className={sticker.collected ? "text-green-500" : "text-gray-400"}>
                {sticker.collected ? <Check size={20} /> : null}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label htmlFor="collected">Coletada</Label>
              <Switch 
                id="collected" 
                checked={sticker.collected} 
                onCheckedChange={handleCollectedToggle} 
              />
            </div>
            
            {sticker.dateCollected && (
              <p className="text-sm text-gray-500 mt-2">
                Coletada em: {new Date(sticker.dateCollected).toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Photo Card - Only show if collected */}
        {sticker.collected && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Foto</CardTitle>
            </CardHeader>
            <CardContent>
              {sticker.photoUrl ? (
                <div className="text-center">
                  <div 
                    className={`aspect-square max-w-48 mx-auto mb-4 rounded-md bg-cover bg-center cursor-pointer border ${stickerType === 'bronze' ? 'border-amber-800 shadow-amber-300/50' : 
                                 stickerType === 'silver' ? 'border-gray-400 shadow-gray-300/50' : 
                                 stickerType === 'gold' ? 'border-yellow-600 shadow-yellow-300/50' : ''} ${
                                 stickerType === 'gold' ? 'shadow-md hover:shadow-lg transition-shadow' : ''
                               }`}
                    style={{ backgroundImage: `url(${sticker.photoUrl})` }}
                    onClick={handleViewPhoto}
                  ></div>
                  
                  <div className="flex justify-center space-x-2">
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center">
                          <Trash2 size={16} className="mr-2" /> Excluir
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Excluir foto</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja excluir esta foto? Esta ação não pode ser desfeita.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
                          <Button variant="destructive" onClick={handleDeletePhoto}>Excluir</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button variant="outline" className="flex items-center" onClick={handleViewPhoto}>
                      <Image size={16} className="mr-2" /> Visualizar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-4">Ainda não há foto para esta figurinha</p>
                  <Button asChild className="bg-sticker-purple hover:bg-sticker-purple-dark" disabled={isUploading}>
                    <label className="flex items-center cursor-pointer">
                      <Camera size={16} className="mr-2" />
                      {isUploading ? "Carregando..." : "Adicionar foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes Card - Only show if collected */}
        {sticker.collected && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Anotações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Adicione anotações sobre esta figurinha..."
                value={notes}
                onChange={handleNotesChange}
                rows={4}
              />
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveNotes}
                className="ml-auto bg-sticker-purple hover:bg-sticker-purple-dark"
              >
                Salvar
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Duplicates Card - Only show if collected */}
        {sticker.collected && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Duplicatas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center mb-4">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleUpdateQuantity(Math.max(1, (sticker.quantity || 1) - 1))}
                    disabled={isUpdatingQuantity || (sticker.quantity || 1) <= 1}
                    className="h-10 w-10 rounded-l-md rounded-r-none"
                  >
                    -
                  </Button>
                  <div className="h-10 px-4 flex items-center justify-center border-y border-input bg-transparent text-lg font-medium">
                    {sticker.quantity || 1}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleUpdateQuantity((sticker.quantity || 1) + 1)}
                    disabled={isUpdatingQuantity}
                    className="h-10 w-10 rounded-r-md rounded-l-none"
                  >
                    +
                  </Button>
                </div>
                
                <p className="text-center text-sm text-gray-500">
                  {sticker.quantity && sticker.quantity > 1 
                    ? `Você tem ${sticker.quantity} exemplares desta figurinha` 
                    : "Você tem 1 exemplar desta figurinha"}
                </p>
                
                <p className="text-xs text-gray-400 mt-1">
                  Use os botões + e - para indicar quantos exemplares você possui
                </p>
                
                {sticker.quantity && sticker.quantity > 1 && (
                  <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500 mb-2">
                      Figurinhas repetidas podem ser trocadas com outros usuários!
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Full screen photo preview */}
      {photoPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img 
              src={photoPreview} 
              alt="Foto da figurinha" 
              className="max-w-full max-h-[80vh] object-contain rounded-md"
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="absolute top-3 right-3 rounded-full bg-black bg-opacity-50 text-white"
              onClick={() => setPhotoPreview(null)}
            >
              <ArrowLeft size={20} />
            </Button>
          </div>
        </div>
      )}

      {/* Replace photo button - fixed at the bottom on mobile */}
      {sticker.photoUrl && sticker.collected && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t flex justify-center">
          <Button asChild className="bg-sticker-purple hover:bg-sticker-purple-dark" disabled={isUploading}>
            <label className="flex items-center cursor-pointer">
              <Camera size={16} className="mr-2" />
              {isUploading ? "Carregando..." : "Trocar foto"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploading}
              />
            </label>
          </Button>
        </div>
      )}
    </div>
  );
};

export default StickerDetail;
