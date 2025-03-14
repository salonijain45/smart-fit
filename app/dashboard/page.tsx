"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Loader2, Activity, Heart, Droplets, Scale, Utensils, Moon, Plus, PenBox, Pencil } from "lucide-react"
import Link from "next/link"
import FillData from "@/components/fill-data"

interface HealthMetrics {
  id: string
  userId: string
  height: number
  weight: number
  age: number
  gender: string
  activityLevel: string
  bloodPressure?: string
  heartRate?: number
  sleepDuration?: number
  stressLevel?: number
  recordedAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only fetch data if the user is authenticated
    if (status === "authenticated") {
      fetchHealthMetrics()
    } else if (status === "unauthenticated") {
      // If definitely not authenticated, redirect to login
      router.push("/login")
    }
    // Don't do anything while status is "loading"
  }, [status, router])

  const fetchHealthMetrics = async () => {
    try {
      const response = await fetch("/api/health/latest")
      
      if (!response.ok) {
        throw new Error("Failed to fetch health metrics")
      }
      
      const data = await response.json()
      setHealthMetrics(data)
    } catch (error) {
      console.error("Error fetching health metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading state while checking authentication or fetching data
  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render anything (we're redirecting)
  if (status === "unauthenticated") {
    return null
  }

  // If authenticated but no health data
  if (!healthMetrics && !loading) {
    return (
      <FillData/>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Your Health Dashboard</h1>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Hello, {session?.user?.name || "User"}</h2>
          <p className="text-muted-foreground">Here's a summary of your health status</p>
        </div>
        <Link href="/initial-health-form">
        <Button className="bg-primary text-muted hover:bg-primary hover:text-muted" variant="outline">
          <PenBox className="mr-2 h-4 w-4" />
          Update Health Details
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Heart Rate</CardTitle>
                <Heart className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthMetrics?.heartRate || "--"} bpm</div>
                <p className="text-xs text-muted-foreground">Normal range</p>
                <Progress value={70} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Blood Pressure</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthMetrics?.bloodPressure || "--"}</div>
                <p className="text-xs text-muted-foreground">Last recorded</p>
                <Progress value={65} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Weight</CardTitle>
                <Scale className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthMetrics?.weight || "--"} kg</div>
                <p className="text-xs text-muted-foreground">Healthy BMI range</p>
                <Progress value={80} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Sleep Duration</CardTitle>
                <Moon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthMetrics?.sleepDuration || "--"} hrs</div>
                <p className="text-xs text-muted-foreground">Recommended: 7-9 hours</p>
                <Progress value={75} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hydration</CardTitle>
                <Droplets className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.8 L</div>
                <p className="text-xs text-muted-foreground">Goal: 2.5 L</p>
                <Progress value={72} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Nutrition</CardTitle>
                <Utensils className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1850 kcal</div>
                <p className="text-xs text-muted-foreground">Daily target: 2000 kcal</p>
                <Progress value={92} className="mt-2" />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Health Summary</CardTitle>
                <CardDescription>Your overall health status is good</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Based on your recent metrics, your health indicators are within normal ranges. Continue maintaining your current lifestyle habits.</p>
                <Button className="mt-4" variant="outline">View Detailed Report</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Personalized health suggestions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>• Increase water intake by 500ml daily</p>
                <p>• Consider adding 15 minutes of stretching to your routine</p>
                <p>• Your sleep pattern is consistent, keep it up!</p>
                <Button className="mt-2" variant="outline">View All Recommendations</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vital Signs</CardTitle>
              <CardDescription>Your key health indicators over time</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Detailed vitals tracking will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Tracking</CardTitle>
              <CardDescription>Your movement and exercise patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Detailed activity tracking will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="nutrition" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nutrition Insights</CardTitle>
              <CardDescription>Your dietary patterns and nutrition</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Detailed nutrition tracking will be available soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

