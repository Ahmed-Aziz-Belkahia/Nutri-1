import React, { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Utensils, Clipboard, ArrowLeft, UserCheck, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
// Custom API request function
const apiRequest = async (method: string, url: string, data?: any) => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  return fetch(url, options);
};

// Custom query function
const getQueryFn = (options?: { on401?: 'returnNull' }) => {
  return async ({ queryKey }: { queryKey: (string | number | null | undefined)[] }) => {
    const [endpointRaw, ...params] = queryKey;
    const endpoint = String(endpointRaw);
    const safeParams = params.filter((p) => p !== null && p !== undefined).map((p) => encodeURIComponent(String(p)));
    const url = safeParams.length > 0 ? `${endpoint}/${safeParams.join('/')}` : endpoint;
    
    try {
      const res = await fetch(url, {
        credentials: 'include',
      });
      
      if (res.status === 401) {
        if (options?.on401 === 'returnNull') {
          return null;
        }
        throw new Error('Not authenticated');
      }
      
      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }
      
      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  };
};

export default function AdminDashboard() {
  const { t } = useTranslation(['common']);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("users");

  // Fetch all users
  const {
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn(),
  });

  // Fetch all food logs
  const {
    data: foodLogs,
    isLoading: isLoadingFoodLogs,
    error: foodLogsError,
  } = useQuery({
    queryKey: ["/api/admin/food-logs"],
    queryFn: getQueryFn(),
    enabled: activeTab === "foodLogs",
  });

  // Fetch all recipes
  const {
    data: recipes,
    isLoading: isLoadingRecipes,
    error: recipesError,
  } = useQuery({
    queryKey: ["/api/admin/recipes"],
    queryFn: getQueryFn(),
    enabled: activeTab === "recipes",
  });

  // Fetch user progress if a user is selected
  const {
    data: userProgress,
    isLoading: isLoadingUserProgress,
    error: userProgressError,
  } = useQuery({
    queryKey: ["/api/admin/progress", selectedUserId ?? undefined],
    queryFn: getQueryFn(),
    enabled: !!selectedUserId && activeTab === "userDetail",
  });

  // Fetch user's food logs if a user is selected
  const {
    data: userFoodLogs,
    isLoading: isLoadingUserFoodLogs,
    error: userFoodLogsError,
  } = useQuery({
    queryKey: ["/api/admin/food-logs", selectedUserId ?? undefined],
    queryFn: getQueryFn(),
    enabled: !!selectedUserId && activeTab === "userFoodLogs",
  });

  // Fetch user's recipes if a user is selected
  const {
    data: userRecipes,
    isLoading: isLoadingUserRecipes,
    error: userRecipesError,
  } = useQuery({
    queryKey: ["/api/admin/recipes", selectedUserId ?? undefined],
    queryFn: getQueryFn(),
    enabled: !!selectedUserId && activeTab === "userRecipes",
  });

  // Mutation to toggle admin status
  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: number; isAdmin: boolean }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/admin/users/${userId}`,
        { isAdmin }
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t('common:adminDashboard.toast.success'),
        description: t('common:adminDashboard.toast.adminUpdated'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common:adminDashboard.toast.error'),
        description: `${t('common:adminDashboard.toast.updateFailed')} ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: t('common:adminDashboard.toast.success'),
        description: t('common:adminDashboard.toast.userDeleted'),
      });
      if (selectedUserId) {
        setSelectedUserId(null);
        setActiveTab("users");
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('common:adminDashboard.toast.error'),
        description: `${t('common:adminDashboard.toast.deleteFailed')} ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleToggleAdmin = (userId: number, currentStatus: boolean) => {
    toggleAdminMutation.mutate({ userId, isAdmin: !currentStatus });
  };

  const handleDeleteUser = (userId: number) => {
    deleteUserMutation.mutate(userId);
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUserId(userId);
    setActiveTab("userDetail");
  };

  const handleBackToUsers = () => {
    setSelectedUserId(null);
    setActiveTab("users");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (usersError) {
    return (
      <div className="w-full px-6 lg:px-12 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <Shield className="mr-2" /> {t('common:adminDashboard.title')}
        </h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{t('common:adminDashboard.error.loadingData')}</p>
          <Button
            variant="link"
            className="p-0 mt-2 text-red-700"
            onClick={() => setLocation("/")}
          >
            {t('common:adminDashboard.error.returnHome')}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingUsers) {
    return (
      <div className="w-full px-6 lg:px-12 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center">
          <Shield className="mr-2" /> {t('common:adminDashboard.title')}
        </h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // User detail view
  if (selectedUserId) {
    const selectedUser = users?.find((user: any) => user.id === selectedUserId);

    if (!selectedUser) {
      return (
        <div className="w-full px-6 lg:px-12 py-8">
          <h1 className="text-3xl font-bold mb-8 flex items-center">
            <Shield className="mr-2" /> {t('common:adminDashboard.title')}
          </h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{t('common:adminDashboard.error.userNotFound')}</p>
            <Button
              variant="link"
              className="p-0 mt-2 text-red-700"
              onClick={handleBackToUsers}
            >
              {t('common:adminDashboard.backToUsers')}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full px-6 lg:px-12 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center">
            <Shield className="mr-2" /> {t('common:adminDashboard.title')}
          </h1>
          <Button variant="outline" onClick={handleBackToUsers}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('common:adminDashboard.backToUsers')}
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">{t('common:adminDashboard.userProfile.title')}</CardTitle>
                <CardDescription>
                  {t('common:adminDashboard.userProfile.userId')} {selectedUser.id}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAdmin(selectedUser.id, selectedUser.isAdmin)}
                >
                  {selectedUser.isAdmin ? t('common:adminDashboard.userProfile.removeAdmin') : t('common:adminDashboard.userProfile.makeAdmin')}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" /> {t('common:adminDashboard.userProfile.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('common:adminDashboard.deleteDialog.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('common:adminDashboard.deleteDialog.description')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common:adminDashboard.deleteDialog.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteUser(selectedUser.id)}>
                        {t('common:adminDashboard.deleteDialog.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-500">{t('common:adminDashboard.userProfile.email')}</h3>
                <p>{selectedUser.email}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">{t('common:adminDashboard.userProfile.status')}</h3>
                <div className="flex mt-1">
                  {selectedUser.isAdmin && (
                    <Badge className="mr-2 bg-blue-500">{t('common:adminDashboard.userProfile.admin')}</Badge>
                  )}
                  {selectedUser.hasCompletedOnboarding ? (
                    <Badge className="bg-green-500">{t('common:adminDashboard.userProfile.onboarded')}</Badge>
                  ) : (
                    <Badge variant="outline">{t('common:adminDashboard.userProfile.notOnboarded')}</Badge>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">{t('common:adminDashboard.userProfile.lastActive')}</h3>
                <p>
                  {selectedUser.lastActivityDate
                    ? formatDate(selectedUser.lastActivityDate)
                    : t('common:adminDashboard.userProfile.never')}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-500">{t('common:adminDashboard.userProfile.language')}</h3>
                <p>{selectedUser.preferred_language || "English"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-8">
            <TabsTrigger value="userDetail">{t('common:adminDashboard.tabs.profileData')}</TabsTrigger>
            <TabsTrigger value="userFoodLogs">{t('common:adminDashboard.tabs.userFoodLogs')}</TabsTrigger>
            <TabsTrigger value="userRecipes">{t('common:adminDashboard.tabs.userRecipes')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="userDetail">
            {isLoadingUserProgress ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : userProgressError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>{t('common:adminDashboard.error.loadingProgress')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Nutrition Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('common:adminDashboard.nutrition.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userProgress?.nutrition ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium text-gray-500">{t('common:adminDashboard.nutrition.dietaryType')}</h3>
                          <p>{userProgress.nutrition.dietaryType || t('common:adminDashboard.nutrition.notSet')}</p>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-500">{t('common:adminDashboard.nutrition.calorieTarget')}</h3>
                          <p>{userProgress.nutrition.calorieTarget || t('common:adminDashboard.nutrition.notSet')} {t('common:adminDashboard.nutrition.kcal')}</p>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-500">{t('common:adminDashboard.nutrition.mealsPerDay')}</h3>
                          <p>{userProgress.nutrition.mealsPerDay || t('common:adminDashboard.nutrition.notSet')}</p>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-500">{t('common:adminDashboard.nutrition.allergies')}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {userProgress.nutrition.allergies && userProgress.nutrition.allergies.length > 0 ? (
                              userProgress.nutrition.allergies.map((allergy: string, i: number) => (
                                <Badge key={i} variant="outline">
                                  {allergy}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-gray-400">{t('common:adminDashboard.nutrition.noAllergies')}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400">{t('common:adminDashboard.nutrition.noPreferences')}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Weight History */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('common:adminDashboard.weight.title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userProgress?.weights && userProgress.weights.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('common:adminDashboard.weight.date')}</TableHead>
                              <TableHead>{t('common:adminDashboard.weight.weight')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {userProgress.weights.map((entry: any) => (
                              <TableRow key={entry.id}>
                                <TableCell>{formatDate(entry.loggedAt)}</TableCell>
                                <TableCell>{entry.weight} {entry.unit}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-gray-400">{t('common:adminDashboard.weight.noHistory')}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="userFoodLogs">
            {isLoadingUserFoodLogs ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : userFoodLogsError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Error loading user food logs.</p>
              </div>
            ) : userFoodLogs && userFoodLogs.length > 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Food</TableHead>
                          <TableHead>Meal Type</TableHead>
                          <TableHead>Calories</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userFoodLogs.map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell>{formatDate(log.createdAt)}</TableCell>
                            <TableCell>{log.name}</TableCell>
                            <TableCell className="capitalize">{log.mealType}</TableCell>
                            <TableCell>{log.calories}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-gray-400 py-12">No food logs recorded</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="userRecipes">
            {isLoadingUserRecipes ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : userRecipesError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Error loading user recipes.</p>
              </div>
            ) : userRecipes && userRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userRecipes.map((recipe: any) => (
                  <Card key={recipe.id} className="overflow-hidden">
                    {recipe.imageUrl && (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <CardHeader className={!recipe.imageUrl ? "pt-6" : "pt-4"}>
                      <CardTitle>{recipe.name}</CardTitle>
                      <CardDescription>
                        {recipe.cuisine} • {recipe.difficulty}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm">
                        <span>Calories: {recipe.nutritionInfo?.calories || "N/A"}</span>
                        <span>{formatDate(recipe.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-gray-400 py-12">No recipes created</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Main admin dashboard
  return (
    <div className="w-full px-6 lg:px-12 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <Shield className="mr-2" /> Admin Dashboard
      </h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="foodLogs" className="flex items-center">
            <Utensils className="mr-2 h-4 w-4" /> Food Logs
          </TabsTrigger>
          <TabsTrigger value="recipes" className="flex items-center">
            <Clipboard className="mr-2 h-4 w-4" /> Recipes
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>{t('common:adminDashboard.users.title')}</CardTitle>
              <CardDescription>
                {t('common:adminDashboard.users.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common:adminDashboard.users.tableHeaders.id')}</TableHead>
                      <TableHead>{t('common:adminDashboard.users.tableHeaders.email')}</TableHead>
                      <TableHead>{t('common:adminDashboard.users.tableHeaders.status')}</TableHead>
                      <TableHead>{t('common:adminDashboard.users.tableHeaders.lastActive')}</TableHead>
                      <TableHead>{t('common:adminDashboard.users.tableHeaders.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex">
                            {user.isAdmin && (
                              <Badge className="mr-2 bg-blue-500">{t('common:adminDashboard.userProfile.admin')}</Badge>
                            )}
                            {user.hasCompletedOnboarding ? (
                              <Badge className="bg-green-500">{t('common:adminDashboard.userProfile.onboarded')}</Badge>
                            ) : (
                              <Badge variant="outline">{t('common:adminDashboard.userProfile.notOnboarded')}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.lastActivityDate
                            ? formatDate(user.lastActivityDate)
                            : t('common:adminDashboard.userProfile.never')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserSelect(user.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" /> {t('common:adminDashboard.userProfile.view')}
                            </Button>
                            <Button
                              variant={user.isAdmin ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                            >
                              {user.isAdmin ? (
                                <>
                                  <Shield className="h-4 w-4 mr-1" /> {t('common:adminDashboard.userProfile.removeAdmin')}
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-1" /> {t('common:adminDashboard.userProfile.makeAdmin')}
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Food Logs Tab */}
        <TabsContent value="foodLogs">
          <Card>
            <CardHeader>
              <CardTitle>{t('common:adminDashboard.foodLogs.title')}</CardTitle>
              <CardDescription>
                {t('common:adminDashboard.foodLogs.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFoodLogs ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : foodLogsError ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <p>{t('common:adminDashboard.error.loadingFoodLogs')}</p>
                </div>
              ) : foodLogs && foodLogs.length > 0 ? (
                <div className="rounded-md border max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common:adminDashboard.foodLogs.tableHeaders.userId')}</TableHead>
                        <TableHead>{t('common:adminDashboard.foodLogs.tableHeaders.food')}</TableHead>
                        <TableHead>{t('common:adminDashboard.foodLogs.tableHeaders.mealType')}</TableHead>
                        <TableHead>{t('common:adminDashboard.foodLogs.tableHeaders.calories')}</TableHead>
                        <TableHead>{t('common:adminDashboard.foodLogs.tableHeaders.date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {foodLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Button
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() => {
                                setSelectedUserId(log.userId);
                                setActiveTab("userDetail");
                              }}
                            >
                              {log.userId}
                            </Button>
                          </TableCell>
                          <TableCell>{log.name}</TableCell>
                          <TableCell className="capitalize">{log.mealType}</TableCell>
                          <TableCell>{log.calories}</TableCell>
                          <TableCell>{formatDate(log.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-12">{t('common:adminDashboard.foodLogs.noLogs')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes">
          <Card>
            <CardHeader>
              <CardTitle>{t('common:adminDashboard.recipes.title')}</CardTitle>
              <CardDescription>
                {t('common:adminDashboard.recipes.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRecipes ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : recipesError ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  <p>{t('common:adminDashboard.error.loadingRecipes')}</p>
                </div>
              ) : recipes && recipes.length > 0 ? (
                <div className="rounded-md border max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common:adminDashboard.recipes.tableHeaders.userId')}</TableHead>
                        <TableHead>{t('common:adminDashboard.recipes.tableHeaders.name')}</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>{t('common:adminDashboard.recipes.tableHeaders.calories')}</TableHead>
                        <TableHead>{t('common:adminDashboard.recipes.tableHeaders.date')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipes.map((recipe: any) => (
                        <TableRow key={recipe.id}>
                          <TableCell>
                            <Button
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() => {
                                setSelectedUserId(recipe.userId);
                                setActiveTab("userDetail");
                              }}
                            >
                              {recipe.userId}
                            </Button>
                          </TableCell>
                          <TableCell>{recipe.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {recipe.source === "created" ? "User Created" : "Saved"}
                            </Badge>
                          </TableCell>
                          <TableCell>{recipe.nutritionInfo?.calories || "N/A"}</TableCell>
                          <TableCell>{formatDate(recipe.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-12">{t('common:adminDashboard.recipes.noRecipes')}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}