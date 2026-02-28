import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { API_HOST } from '@/config/api';

const ProfilePictureUpload = () => {
    const { user, updateProfile } = useAuth();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast({
                title: "Invalid file type",
                description: "Please upload an image (JPEG, PNG, or WebP)",
                variant: "destructive"
            });
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Maximum file size is 5MB",
                variant: "destructive"
            });
            return;
        }


        const formData = new FormData();
        formData.append('avatar', file);

        setIsUploading(true);
        try {
            const response = await usersAPI.uploadAvatar(formData);
            if (response.success) {
                updateProfile({ avatarUrl: response.data.avatarUrl });
                toast({
                    title: "Profile picture updated",
                    description: "Your new profile picture has been saved."
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Upload failed",
                description: "Could not upload profile picture. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const avatarSrc = user?.avatarUrl ? user.avatarUrl.replace('/uploads/', '/api/uploads/') : undefined;

    return (
        <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={avatarSrc} className="object-cover" />
                <AvatarFallback className="text-2xl font-bold bg-hero-gradient text-white">
                    {getInitials(user?.fullName || user?.email || '')}
                </AvatarFallback>
            </Avatar>

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
                {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Camera className="w-4 h-4" />
                )}
            </button>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
};

export default ProfilePictureUpload;
