import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Users, Package, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminAccess();
  }, [navigate]);

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [productsRes, usersRes, votesRes] = await Promise.all([
        supabase.from('products').select('id, status').eq('status', 'pending'),
        supabase.from('users').select('id'),
        supabase.from('votes').select('id'),
      ]);

      return {
        pendingProducts: productsRes.data?.length || 0,
        totalUsers: usersRes.data?.length || 0,
        totalVotes: votesRes.data?.length || 0,
      };
    },
    enabled: isAdmin,
  });

  const { data: pendingProducts } = useQuery({
    queryKey: ['pending-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, users!products_owner_id_fkey(username, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (usersError) throw usersError;

      // Fetch roles separately for each user
      const usersWithRoles = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          return {
            ...user,
            user_roles: rolesData || [],
          };
        })
      );

      return usersWithRoles;
    },
    enabled: isAdmin,
  });

  const approveProduct = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'live' })
      .eq('id', productId);

    if (error) {
      toast.error('Failed to approve product');
      return;
    }

    toast.success('Product approved');
  };

  const rejectProduct = async (productId: string) => {
    const { error } = await supabase
      .from('products')
      .update({ status: 'rejected' })
      .eq('id', productId);

    if (error) {
      toast.error('Failed to reject product');
      return;
    }

    toast.success('Product rejected');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingProducts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVotes || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Products</CardTitle>
              <CardDescription>Review and moderate product submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingProducts?.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.tagline}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          By: {product.users?.username}
                        </p>
                      </div>
                      <Badge variant="outline">{product.status}</Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approveProduct(product.id)}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => rejectProduct(product.id)}
                        className="flex items-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/launch/${product.slug}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
                
                {pendingProducts?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No pending products to review
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage user accounts and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allUsers?.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        alt={user.username}
                        className="h-10 w-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(user.created_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.user_roles?.map((ur: any) => (
                        <Badge key={ur.role} variant="secondary">
                          {ur.role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;