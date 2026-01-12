import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Calendar, Tags } from 'lucide-react';
import AdminSeoTab from '@/components/AdminSeoTab';
import { format } from 'date-fns';

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
      const [allProductsRes, usersRes, votesRes, sponsoredRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
        supabase.from('sponsored_products').select('id, sponsorship_type')
          .gte('start_date', format(new Date(), 'yyyy-MM-01')),
      ]);

      // Calculate advertising revenue from active/upcoming sponsorships
      const sponsorships = sponsoredRes.data || [];
      let totalRevenue = 0;
      sponsorships.forEach(sp => {
        if (sp.sponsorship_type === 'website') totalRevenue += 750;
        else if (sp.sponsorship_type === 'newsletter') totalRevenue += 500;
        else if (sp.sponsorship_type === 'combined') totalRevenue += 1000;
      });

      return {
        totalProducts: allProductsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalVotes: votesRes.count || 0,
        activeSponsorships: sponsorships.length,
        advertisingRevenue: totalRevenue,
      };
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

  const { data: sponsoredProducts, refetch: refetchSponsored } = useQuery({
    queryKey: ['sponsored-products-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sponsored_products')
        .select(`
          *,
          products(id, name, slug, tagline)
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: promotionOrders } = useQuery({
    queryKey: ['promotion-orders-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products(id, name, slug, tagline, launch_date),
          users!orders_user_id_fkey(username, name, avatar_url)
        `)
        .in('plan', ['join', 'skip']) // join = Launch Lite, skip = Launch
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });


  const deleteSponsorship = async (sponsorshipId: string) => {
    const { error } = await supabase
      .from('sponsored_products')
      .delete()
      .eq('id', sponsorshipId);

    if (error) {
      toast.error('Failed to delete sponsorship');
      return;
    }

    toast.success('Sponsorship deleted');
    refetchSponsored();
  };


  const getSponsorshipTypeLabel = (type: string) => {
    switch (type) {
      case 'website': return 'Website';
      case 'newsletter': return 'Newsletter';
      case 'combined': return 'Combined';
      default: return type;
    }
  };

  const getSponsorshipPrice = (type: string) => {
    switch (type) {
      case 'website': return 750;
      case 'newsletter': return 500;
      case 'combined': return 1000;
      default: return 0;
    }
  };

  const isSponsorshipActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  const isSponsorshipUpcoming = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    return now < start;
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <img src="/images/launch-logo.png" alt="Launch" className="h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">🚀 {stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <img src="/images/launch-logo.png" alt="Launch" className="h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">🎉 {stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <img src="/images/launch-logo.png" alt="Launch" className="h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">⭐ {stats?.totalVotes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sponsors</CardTitle>
            <img src="/images/launch-logo.png" alt="Launch" className="h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">🎯 {stats?.activeSponsorships || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ad Revenue</CardTitle>
            <img src="/images/launch-logo.png" alt="Launch" className="h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">💰 ${stats?.advertisingRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">This month+</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Members</TabsTrigger>
          <TabsTrigger value="promotion">Promotion</TabsTrigger>
          <TabsTrigger value="advertising">Advertising</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Manage member accounts and roles</CardDescription>
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

        <TabsContent value="promotion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Products to Promote</CardTitle>
              <CardDescription>Products with Launch Lite or Launch plans that need promotion on socials and newsletter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {promotionOrders?.map((order) => {
                  const planLabel = order.plan === 'join' ? 'Launch Lite' : 'Launch';
                  const planPrice = order.plan === 'join' ? '$9' : '$39';
                  
                  return (
                    <div key={order.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{order.products?.name || 'Unknown Product'}</h3>
                            <Badge variant={order.plan === 'skip' ? 'default' : 'secondary'}>
                              {planLabel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{order.products?.tagline}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>By: {order.users?.name || order.users?.username}</span>
                            {order.products?.launch_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Launch: {format(new Date(order.products.launch_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">{planPrice}</p>
                          <p className="text-xs text-muted-foreground">
                            Ordered {format(new Date(order.created_at!), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/launch/${order.products?.slug}`)}
                        >
                          View Product
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {(!promotionOrders || promotionOrders.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No paid launch plans yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advertising" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sponsored Products</CardTitle>
              <CardDescription>View and manage all sponsorship bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sponsoredProducts?.map((sp) => {
                  const isActive = isSponsorshipActive(sp.start_date, sp.end_date);
                  const isUpcoming = isSponsorshipUpcoming(sp.start_date);
                  
                  return (
                    <div key={sp.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{sp.products?.name || 'Unknown Product'}</h3>
                            {isActive && <Badge className="bg-green-600">Active</Badge>}
                            {isUpcoming && <Badge variant="secondary">Upcoming</Badge>}
                            {!isActive && !isUpcoming && <Badge variant="outline">Expired</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{sp.products?.tagline}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{getSponsorshipTypeLabel(sp.sponsorship_type)}</Badge>
                          <p className="text-lg font-bold text-primary mt-1">
                            ${getSponsorshipPrice(sp.sponsorship_type)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(sp.start_date), 'MMM d, yyyy')} - {format(new Date(sp.end_date), 'MMM d, yyyy')}</span>
                        </div>
                        <span>Position: #{sp.position}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/launch/${sp.products?.slug}`)}
                        >
                          View Product
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteSponsorship(sp.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {sponsoredProducts?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No sponsorships found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <AdminSeoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
