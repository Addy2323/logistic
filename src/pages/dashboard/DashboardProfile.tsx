import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Shield, Loader2 } from "lucide-react";
import ProfilePictureUpload from "@/components/dashboard/ProfilePictureUpload";
import { useState } from "react";
import { usersAPI } from "@/lib/api";

const DashboardProfile = () => {
  const { t } = useTranslation();
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || "",
    phone: user?.phone || ""
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await usersAPI.updateProfile(formData);
      if (response.success) {
        updateProfile(response.data);
        toast({
          title: t("dashboard.profile.toasts.updated"),
          description: t("dashboard.profile.toasts.updatedDesc"),
        });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast({
        title: "Update failed",
        description: "Could not update profile details.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard.profile.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.profile.desc")}</p>
      </div>

      {/* Profile Header */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-6">
          <ProfilePictureUpload />
          <div>
            <h2 className="text-xl font-bold text-foreground">{user?.fullName}</h2>
            <p className="text-muted-foreground capitalize">{user?.role} {t("dashboard.profile.account")}</p>
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">{t("dashboard.profile.verified")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <h3 className="text-lg font-bold text-foreground">{t("dashboard.profile.personalInfo")}</h3>

        <div className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">{t("dashboard.profile.fullName")}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t("dashboard.profile.email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={user?.email}
                disabled
                className="pl-10 bg-muted/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t("dashboard.profile.phone")}</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={t("dashboard.profile.phonePlaceholder")}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("dashboard.profile.address")}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <textarea
                id="address"
                className="w-full min-h-[100px] pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={t("dashboard.profile.addressPlaceholder")}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button variant="outline">{t("dashboard.profile.cancel")}</Button>
          <Button variant="hero" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t("dashboard.profile.save")}
          </Button>
        </div>
      </div>


      {/* Security Section */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <h3 className="text-lg font-bold text-foreground">{t("dashboard.profile.security.title")}</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <p className="font-medium text-foreground">{t("dashboard.profile.security.password")}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.profile.security.lastChanged", { days: 30 })}</p>
            </div>
            <Button variant="outline" size="sm">{t("dashboard.profile.security.change")}</Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <p className="font-medium text-foreground">{t("dashboard.profile.security.twoFactor")}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.profile.security.twoFactorDesc")}</p>
            </div>
            <Button variant="outline" size="sm">{t("dashboard.profile.security.enable")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardProfile;
