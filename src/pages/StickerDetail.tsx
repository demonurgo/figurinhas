
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { getStickersByUserId, updateSticker, Sticker } from "@/models/StickerModel";
import { ArrowLeft, Camera, Trash2, Image, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const StickerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const stickerId = parseInt(id || "0");
  const { currentUser } = useAuth();
  const [sticker, setSticker] = useState<Sticker | null>(null);
  const [notes, setNotes] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && stickerId) {
      const userStickers = getStickersByUserId(currentUser.id);
      const foundSticker = userStickers.find(s => s.id === stickerId);
      
      if (foundSticker) {
        setSticker(foundSticker);
        setNotes(foundSticker.notes || "");
      }
    }
  }, [currentUser, stickerId]);

  const handleCollectedToggle = () => {
    if (!sticker || !currentUser) return;
    
    const updatedSticker: Sticker = {
      ...sticker,
      collected: !sticker.collected,
      dateCollected: !sticker.collected ? new Date().toISOString() : undefined
    };
    
    updateSticker(currentUser.id, updatedSticker);
    setSticker(updatedSticker);
    
    toast({
      title: updatedSticker.collected ? "Figurinha coletada!" : "Figurinha removida",
      description: updatedSticker.collected 
        ? `Figurinha #${sticker.id} marcada como coletada` 
        : `Figurinha #${sticker.id} marcada como não coletada`,
    });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleSaveNotes = () => {
    if (!sticker || !currentUser) return;
    
    const updatedSticker: Sticker = {
      ...sticker,
      notes
    };
    
    updateSticker(currentUser.id, updatedSticker);
    setSticker(updatedSticker);
    
    toast({
      title: "Notas salvas",
      description: "As anotações sobre esta figurinha foram salvas."
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sticker || !currentUser) return;
    
    // Convert to base64 for storage
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      
      const updatedSticker: Sticker = {
        ...sticker,
        photoUrl: base64data
      };
      
      updateSticker(currentUser.id, updatedSticker);
      setSticker(updatedSticker);
      
      toast({
        title: "Foto adicionada",
        description: "A foto da figurinha foi salva com sucesso!"
      });
    };
  };

  const handleDeletePhoto = () => {
    if (!sticker || !currentUser) return;
    
    const updatedSticker: Sticker = {
      ...sticker,
      photoUrl: undefined
    };
    
    updateSticker(currentUser.id, updatedSticker);
    setSticker(updatedSticker);
    
    toast({
      title: "Foto removida",
      description: "A foto da figurinha foi removida."
    });
    
    setShowDeleteDialog(false);
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

        {/* Photo Card */}
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
                <Button asChild className="bg-sticker-purple hover:bg-sticker-purple-dark">
                  <label className="flex items-center cursor-pointer">
                    <Camera size={16} className="mr-2" />
                    Adicionar foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Card */}
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
      {sticker.photoUrl && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t flex justify-center">
          <Button asChild className="bg-sticker-purple hover:bg-sticker-purple-dark">
            <label className="flex items-center cursor-pointer">
              <Camera size={16} className="mr-2" />
              Trocar foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
          </Button>
        </div>
      )}
    </div>
  );
};

export default StickerDetail;
