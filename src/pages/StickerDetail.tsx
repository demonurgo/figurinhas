
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
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSticker() {
      if (currentUser && stickerId) {
        const userStickers = await getStickersByUserId(currentUser.id);
        const foundSticker = userStickers.find(s => s.id === stickerId);
        
        if (foundSticker) {
          setSticker(foundSticker);
          setNotes(foundSticker.notes || "");
        } else {
          // Create a new sticker if not found
          const newSticker: Sticker = {
            id: stickerId,
            collected: false
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
      dateCollected: !sticker.collected ? new Date().toISOString() : undefined
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
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sticker_photos')
        .upload(filePath, file);
        
      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: "Não foi possível fazer o upload da imagem."
        });
        return;
      }
      
      // Get public URL
      const { data } = supabase.storage
        .from('sticker_photos')
        .getPublicUrl(filePath);
        
      // Update sticker with photo URL
      const updatedSticker: Sticker = {
        ...sticker,
        photoUrl: data.publicUrl
      };
      
      const success = await updateSticker(currentUser.id, updatedSticker);
      if (success) {
        setSticker(updatedSticker);
        
        toast({
          title: "Foto adicionada",
          description: "A foto da figurinha foi salva com sucesso!"
        });
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao fazer o upload da foto."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!sticker || !currentUser || !sticker.photoUrl) return;
    
    try {
      // Extract file path from URL
      const urlParts = sticker.photoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${currentUser.id}/${fileName}`;
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('sticker_photos')
        .remove([filePath]);
        
      if (storageError) {
        console.error('Storage delete error:', storageError);
      }
      
      // Update sticker
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
      // If there's a photo, delete it first
      if (sticker.photoUrl) {
        const urlParts = sticker.photoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${currentUser.id}/${fileName}`;
        
        await supabase.storage
          .from('sticker_photos')
          .remove([filePath]);
      }
      
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

  if (!sticker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-soft text-sticker-purple-dark">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
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
            <h1 className="text-xl font-bold">Figurinha #{sticker.id}</h1>
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
        <Card className="mb-6">
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
                    className="aspect-square max-w-48 mx-auto mb-4 rounded-md bg-cover bg-center cursor-pointer border"
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
          <Card>
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
