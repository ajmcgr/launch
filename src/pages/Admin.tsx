import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, Tags } from 'lucide-react';
import AdminSeoTab from '@/components/AdminSeoTab';
import Sparkline from '@/components/Sparkline';
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
      const [
        allProductsRes, 
        usersRes, 
        votesRes, 
        ratingsRes, 
        sponsoredRes, 
        ordersRes,
        commentsRes,
        badgesRes,
        mrrRes,
        // Fetch historical data for sparklines
        productsHistory,
        usersHistory,
        votesHistory,
        ratingsHistory,
        commentsHistory,
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
        supabase.from('product_ratings').select('id', { count: 'exact', head: true }),
        supabase.from('sponsored_products').select('id, sponsorship_type, start_date'),
        supabase.from('orders').select('plan, created_at').in('plan', ['join', 'skip']),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'launched'),
        supabase.from('products').select('verified_mrr').not('verified_mrr', 'is', null),
        // Historical data for sparklines (last 9 weeks)
        supabase.from('products').select('created_at').order('created_at', { ascending: true }),
        supabase.from('users').select('created_at').order('created_at', { ascending: true }),
        supabase.from('votes').select('created_at').order('created_at', { ascending: true }),
        supabase.from('product_ratings').select('created_at').order('created_at', { ascending: true }),
        supabase.from('comments').select('created_at').order('created_at', { ascending: true }),
      ]);

      // Helper to generate cumulative weekly counts for sparklines
      const generateWeeklySparkline = (data: { created_at: string | null }[] | null, weeks: number = 9): number[] => {
        if (!data || data.length === 0) return Array(weeks).fill(0);
        
        const now = new Date();
        const result: number[] = [];
        
        for (let i = weeks - 1; i >= 0; i--) {
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() - (i * 7));
          const count = data.filter(item => 
            item.created_at && new Date(item.created_at) <= weekEnd
          ).length;
          result.push(count);
        }
        
        return result;
      };

      // Calculate advertising revenue from all sponsorships
      const sponsorships = sponsoredRes.data || [];
      let totalRevenue = 0;
      sponsorships.forEach(sp => {
        if (sp.sponsorship_type === 'website') totalRevenue += 750;
        else if (sp.sponsorship_type === 'newsletter') totalRevenue += 500;
        else if (sp.sponsorship_type === 'combined') totalRevenue += 1000;
      });

      // Add launch revenues (join = $9, skip = $39)
      const orders = ordersRes.data || [];
      orders.forEach(order => {
        if (order.plan === 'join') totalRevenue += 9;
        else if (order.plan === 'skip') totalRevenue += 39;
      });

      // Generate revenue sparkline
      const revenueByWeek: number[] = [];
      const now = new Date();
      for (let i = 8; i >= 0; i--) {
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        
        let weekRevenue = 0;
        sponsorships.forEach(sp => {
          if (sp.start_date && new Date(sp.start_date) <= weekEnd) {
            if (sp.sponsorship_type === 'website') weekRevenue += 750;
            else if (sp.sponsorship_type === 'newsletter') weekRevenue += 500;
            else if (sp.sponsorship_type === 'combined') weekRevenue += 1000;
          }
        });
        orders.forEach(order => {
          if (order.created_at && new Date(order.created_at) <= weekEnd) {
            if (order.plan === 'join') weekRevenue += 9;
            else if (order.plan === 'skip') weekRevenue += 39;
          }
        });
        revenueByWeek.push(weekRevenue);
      }

      // Generate sponsors sparkline
      const sponsorsSparkline = generateWeeklySparkline(
        sponsorships.map(s => ({ created_at: s.start_date }))
      );

      // Calculate total verified MRR (stored in cents, convert to dollars)
      const mrrProducts = mrrRes.data || [];
      const totalVerifiedMRR = mrrProducts.reduce((sum, p) => sum + (p.verified_mrr || 0), 0) / 100;

      return {
        totalProducts: allProductsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalVotes: votesRes.count || 0,
        totalRatings: ratingsRes.count || 0,
        totalSponsorships: sponsorships.length,
        totalRevenue: totalRevenue,
        totalComments: commentsRes.count || 0,
        totalBadges: badgesRes.count || 0,
        totalVerifiedMRR: totalVerifiedMRR,
        // Sparkline data
        productsSparkline: generateWeeklySparkline(productsHistory.data),
        usersSparkline: generateWeeklySparkline(usersHistory.data),
        votesSparkline: generateWeeklySparkline(votesHistory.data),
        ratingsSparkline: generateWeeklySparkline(ratingsHistory.data),
        commentsSparkline: generateWeeklySparkline(commentsHistory.data),
        sponsorsSparkline,
        badgesSparkline: generateWeeklySparkline(productsHistory.data?.filter(p => p.created_at)),
        revenueSparkline: revenueByWeek,
        mrrSparkline: Array(9).fill(totalVerifiedMRR), // MRR is a snapshot, show flat line at current value
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
    <div className="h-screen flex flex-col overflow-hidden">
      <Tabs defaultValue="metrics" className="flex-1 flex flex-col min-h-0">
        <div className="bg-background sticky top-0 z-10 shrink-0 border-b">
          <div className="container mx-auto px-4 py-4 md:py-6">
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <h1 className="text-4xl font-bold">Admin</h1>
              <div className="flex-1 flex justify-end">
                <TabsList className="hidden md:flex">
                  <TabsTrigger value="metrics">Metrics</TabsTrigger>
                  <TabsTrigger value="manage">Ops</TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>
          <div className="container mx-auto px-4 pb-4 md:hidden flex justify-center">
            <TabsList>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="manage">Ops</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="metrics" className="flex-1 mt-0 data-[state=inactive]:hidden flex flex-col min-h-0 overflow-auto">
          <div className="container mx-auto px-4 py-4 md:py-6 flex-1 flex flex-col">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 flex-1 auto-rows-fr">
              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">⚡ {stats?.totalProducts || 0}</div>
                  <Sparkline data={stats?.productsSparkline || []} />
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">🎉 {stats?.totalUsers || 0}</div>
                  <Sparkline data={stats?.usersSparkline || []} />
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Votes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">⬆ {stats?.totalVotes || 0}</div>
                  <Sparkline data={stats?.votesSparkline || []} />
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Ratings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">⭐ {stats?.totalRatings || 0}</div>
                  <Sparkline data={stats?.ratingsSparkline || []} />
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Comments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">💬 {stats?.totalComments || 0}</div>
                  <Sparkline data={stats?.commentsSparkline || []} />
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Sponsors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">🎯 {stats?.totalSponsorships || 0}</div>
                  <Sparkline data={stats?.sponsorsSparkline || []} />
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Badges Awarded</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">🏅 {stats?.totalBadges || 0}</div>
                  <Sparkline data={stats?.badgesSparkline || []} />
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Verified MRR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">💵 ${stats?.totalVerifiedMRR?.toLocaleString() || 0}</div>
                  <Sparkline data={stats?.mrrSparkline || []} />
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-2xl">
                <img src="/images/launch-logo.png" alt="" className="absolute top-4 right-4 h-8" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">Revenue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-3xl font-bold">💰 ${stats?.totalRevenue?.toLocaleString() || 0}</div>
                  <Sparkline data={stats?.revenueSparkline || []} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="flex-1 mt-0 data-[state=inactive]:hidden">
          <div className="container mx-auto px-4 py-8">
            <Tabs defaultValue="users" className="space-y-4">
              <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start sticky top-0 z-10 bg-background py-2">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
