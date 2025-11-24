import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    bio: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    telegram: '',
    website: '',
    avatar_url: '',
    stripe_customer_id: '',
    email_notifications_enabled: true,
    notify_on_follow: true,
    notify_on_comment: true,
    notify_on_vote: true,
    notify_on_launch: true,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Store old username to check if it changed
      const oldUsername = (await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single()).data?.username;

      const { error } = await supabase
        .from('users')
        .update(profile)
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Profile updated successfully');

      // If username changed, redirect to new profile URL
      if (oldUsername && oldUsername !== profile.username) {
        setTimeout(() => {
          navigate(`/@${profile.username}`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success('Avatar updated successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      
      // Check if user has a Stripe customer ID
      if (!profile.stripe_customer_id) {
        toast.error('No billing information found. Please make a purchase first.');
        return;
      }

      // Call edge function to create portal session
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        body: {
          customerId: profile.stripe_customer_id,
          returnUrl: `${window.location.origin}/settings`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Billing error:', error);
      toast.error('Unable to access billing portal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast.info('Account deletion will be implemented');
    // In production: Soft delete user and send confirmation email
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Public Profile</CardTitle>
                <CardDescription>
                  This information will be displayed publicly on your profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="avatar">Avatar</Label>
                    <div className="flex items-center gap-4">
                      {profile.avatar_url && (
                        <img
                          src={profile.avatar_url}
                          alt="Avatar"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      )}
                      <Input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twitter">X Username</Label>
                    <Input
                      id="twitter"
                      value={profile.twitter}
                      onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram Username</Label>
                    <Input
                      id="instagram"
                      value={profile.instagram}
                      onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn Username</Label>
                    <Input
                      id="linkedin"
                      value={profile.linkedin}
                      onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="youtube">YouTube Channel</Label>
                    <Input
                      id="youtube"
                      value={profile.youtube}
                      onChange={(e) => setProfile({ ...profile, youtube: e.target.value })}
                      placeholder="@channel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram">Telegram Username</Label>
                    <Input
                      id="telegram"
                      value={profile.telegram}
                      onChange={(e) => setProfile({ ...profile, telegram: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Choose what you want to be notified about via email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-enabled">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable all email notifications
                    </p>
                  </div>
                  <Switch
                    id="email-enabled"
                    checked={profile.email_notifications_enabled}
                    onCheckedChange={(checked) => {
                      setProfile({ ...profile, email_notifications_enabled: checked });
                      handleUpdateProfile(new Event('submit') as any);
                    }}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-follow">New Followers</Label>
                      <p className="text-sm text-muted-foreground">
                        When someone follows you or your product
                      </p>
                    </div>
                    <Switch
                      id="notify-follow"
                      checked={profile.notify_on_follow}
                      disabled={!profile.email_notifications_enabled}
                      onCheckedChange={(checked) => {
                        setProfile({ ...profile, notify_on_follow: checked });
                        handleUpdateProfile(new Event('submit') as any);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-comment">Comments</Label>
                      <p className="text-sm text-muted-foreground">
                        When someone comments on your product
                      </p>
                    </div>
                    <Switch
                      id="notify-comment"
                      checked={profile.notify_on_comment}
                      disabled={!profile.email_notifications_enabled}
                      onCheckedChange={(checked) => {
                        setProfile({ ...profile, notify_on_comment: checked });
                        handleUpdateProfile(new Event('submit') as any);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-vote">Votes</Label>
                      <p className="text-sm text-muted-foreground">
                        When someone upvotes your product
                      </p>
                    </div>
                    <Switch
                      id="notify-vote"
                      checked={profile.notify_on_vote}
                      disabled={!profile.email_notifications_enabled}
                      onCheckedChange={(checked) => {
                        setProfile({ ...profile, notify_on_vote: checked });
                        handleUpdateProfile(new Event('submit') as any);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-launch">Product Launches</Label>
                      <p className="text-sm text-muted-foreground">
                        When products you follow are launched
                      </p>
                    </div>
                    <Switch
                      id="notify-launch"
                      checked={profile.notify_on_launch}
                      disabled={!profile.email_notifications_enabled}
                      onCheckedChange={(checked) => {
                        setProfile({ ...profile, notify_on_launch: checked });
                        handleUpdateProfile(new Event('submit') as any);
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account security and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email} disabled />
                  <p className="text-sm text-muted-foreground">
                    Your email address is managed by your authentication provider
                  </p>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h3>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount}>
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing</CardTitle>
                <CardDescription>
                  Manage your payment methods and view billing history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  View and manage your billing information through Stripe
                </p>
                <Button onClick={handleManageBilling} disabled={loading}>
                  {loading ? 'Loading...' : 'Manage Billing'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
