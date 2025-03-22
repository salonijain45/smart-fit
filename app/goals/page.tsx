"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
  PlusIcon,
  ChartBarSquareIcon,
  ArrowDownTrayIcon,
  HeartIcon,
  ChartBarIcon,
  ShareIcon,
  FireIcon,
  BeakerIcon,
  CalendarDaysIcon,
  FlagIcon,
  ClockIcon,
  ScaleIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  BoltIcon
} from "@heroicons/react/24/solid"
import { Progress } from "@/components/ui/progress"
import { IHealthGoal } from "@/models/HealthGoal"

export default function GoalsPage() {
  const [goals, setGoals] = useState<IHealthGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<IHealthGoal | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "weight",
    targetDate: "",
    targetValue: "",
    currentValue: "",
    unit: "",
  })

  // Fetch all goals on component mount
  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/health-goals')
      const data = await response.json()
      
      if (data.success) {
        setGoals(data.data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch goals",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error fetching goals:", error)
      toast({
        title: "Error",
        description: "Failed to fetch goals",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "weight",
      targetDate: "",
      targetValue: "",
      currentValue: "",
      unit: "",
    })
    setEditingGoal(null)
  }

  const handleOpenDialog = (goal: IHealthGoal | null = null) => {
    if (goal) {
      setEditingGoal(goal)
      setFormData({
        title: goal.title,
        description: goal.description || "",
        category: goal.category,
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : "",
        targetValue: goal.targetValue?.toString() || "",
        currentValue: goal.currentValue?.toString() || "",
        unit: goal.unit || "",
      })
    } else {
      resetForm()
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const goalData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        targetDate: formData.targetDate ? new Date(formData.targetDate).toISOString() : undefined,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : undefined,
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        unit: formData.unit,
        progress: formData.currentValue && formData.targetValue
          ? Math.min(100, Math.max(0, (parseFloat(formData.currentValue) / parseFloat(formData.targetValue)) * 100))
          : 0
      }

      let response
      
      if (editingGoal) {
        response = await fetch(`/api/health-goals/${editingGoal._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goalData)
        })
      } else {
        response = await fetch('/api/health-goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(goalData)
        })
      }

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: editingGoal ? "Goal Updated" : "Goal Created",
          description: editingGoal 
            ? "Your goal has been successfully updated." 
            : "Your goal has been successfully created.",
        })
        handleCloseDialog()
        fetchGoals()
      } else {
        toast({
          title: "Error",
          description: data.error || "Something went wrong",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating/updating goal:", error)
      toast({
        title: "Error",
        description: "Failed to save goal",
        variant: "destructive"
      })
    }
  }

  const handleDeleteGoal = async (id: string) => {
    try {
      const response = await fetch(`/api/health-goals/${id}`, {
        method: 'DELETE',
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Goal Deleted",
          description: "Your goal has been successfully deleted."
        })
        fetchGoals()
      } else {
        toast({
          title: "Error",
          description: "Failed to delete goal",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting goal:", error)
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive"
      })
    }
  }

  const handleMarkComplete = async (goal: IHealthGoal) => {
    try {
      const updatedGoal = { ...goal, completed: !goal.completed, progress: goal.completed ? goal.progress : 100 }
      
      const response = await fetch(`/api/health-goals/${goal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGoal)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: updatedGoal.completed ? "Goal Completed" : "Goal Reopened",
          description: updatedGoal.completed 
            ? "Congratulations on achieving your goal!" 
            : "Goal has been marked as in progress."
        })
        fetchGoals()
      } else {
        toast({
          title: "Error",
          description: "Failed to update goal status",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error updating goal status:", error)
      toast({
        title: "Error",
        description: "Failed to update goal status",
        variant: "destructive"
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'weight':
        return <ScaleIcon className="h-5 w-5" />
      case 'exercise':
        return <BoltIcon className="h-5 w-5" />
      case 'nutrition':
        return <FireIcon className="h-5 w-5" />
      case 'sleep':
        return <ClockIcon className="h-5 w-5" />
      case 'hydration':
        return <BeakerIcon className="h-5 w-5" />
      default:
        return <FlagIcon className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'weight':
        return "from-purple-400 to-indigo-500"
      case 'exercise':
        return "from-blue-400 to-indigo-500"
      case 'nutrition':
        return "from-yellow-400 to-orange-500"
      case 'sleep':
        return "from-indigo-400 to-blue-500"
      case 'hydration':
        return "from-green-400 to-emerald-500"
      default:
        return "from-red-400 to-pink-500"
    }
  }

  // Filter goals by category
  const getGoalsByCategory = (category: string) => {
    return goals.filter(goal => goal.category === category)
  }

  const allCategories = ['weight', 'exercise', 'nutrition', 'sleep', 'hydration', 'other']

  return (
    <div className="w-full grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health Goals</h1>
          <p className="text-muted-foreground">Set, track and achieve your personal health goals.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenDialog()}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Goal
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <ChartBarSquareIcon className="h-4 w-4" />
            All Goals
          </TabsTrigger>
          <TabsTrigger value="weight" className="flex items-center gap-2">
            <ScaleIcon className="h-4 w-4" />
            Weight
          </TabsTrigger>
          <TabsTrigger value="exercise" className="flex items-center gap-2">
            <BoltIcon className="h-4 w-4" />
            Exercise
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="flex items-center gap-2">
            <FireIcon className="h-4 w-4" />
            Nutrition
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-2">
            <FlagIcon className="h-4 w-4" />
            Other
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-60">
              <p>Loading goals...</p>
            </div>
          ) : goals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-60">
                <FlagIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No Goals Created Yet</h3>
                <p className="text-muted-foreground mb-4 text-center max-w-md">
                  Start setting your health goals to track your progress and achieve better health outcomes.
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Your First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <Card key={goal._id} className={`bg-gradient-to-br ${getCategoryColor(goal.category)}`}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                      {getCategoryIcon(goal.category)}
                      {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                    </CardTitle>
                    {goal.completed && (
                      <CheckCircleIcon className="h-5 w-5 text-white" />
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <h3 className="text-xl font-bold text-white">{goal.title}</h3>
                    {goal.description && (
                      <p className="text-sm text-white opacity-90">{goal.description}</p>
                    )}
                    
                    {goal.targetValue && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-white opacity-90">Progress</span>
                          <span className="text-sm text-white">
                            {goal.currentValue || 0} / {goal.targetValue} {goal.unit}
                          </span>
                        </div>
                        <Progress className="h-2 bg-white/20" value={goal.progress} />
                      </div>
                    )}

                    {goal.targetDate && (
                      <div className="flex items-center gap-1 text-sm text-white opacity-90">
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => handleMarkComplete(goal)}
                      >
                        {goal.completed ? 'Reopen' : 'Complete'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleOpenDialog(goal)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => handleDeleteGoal(goal._id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {allCategories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-60">
                <p>Loading goals...</p>
              </div>
            ) : getGoalsByCategory(category).length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-60">
                  {getCategoryIcon(category)}
                  <h3 className="text-xl font-medium mb-2 mt-4">No {category.charAt(0).toUpperCase() + category.slice(1)} Goals</h3>
                  <p className="text-muted-foreground mb-4 text-center max-w-md">
                    Create your first {category} goal to start tracking your progress.
                  </p>
                  <Button onClick={() => {
                    setFormData(prev => ({ ...prev, category }));
                    handleOpenDialog();
                  }}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add {category.charAt(0).toUpperCase() + category.slice(1)} Goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getGoalsByCategory(category).map((goal) => (
                  <Card key={goal._id} className={`bg-gradient-to-br ${getCategoryColor(category)}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                        {getCategoryIcon(category)}
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </CardTitle>
                      {goal.completed && (
                        <CheckCircleIcon className="h-5 w-5 text-white" />
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <h3 className="text-xl font-bold text-white">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-sm text-white opacity-90">{goal.description}</p>
                      )}
                      
                      {goal.targetValue && (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-white opacity-90">Progress</span>
                            <span className="text-sm text-white">
                              {goal.currentValue || 0} / {goal.targetValue} {goal.unit}
                            </span>
                          </div>
                          <Progress className="h-2 bg-white/20" value={goal.progress} />
                        </div>
                      )}

                      {goal.targetDate && (
                        <div className="flex items-center gap-1 text-sm text-white opacity-90">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="secondary" 
                          className="flex-1" 
                          onClick={() => handleMarkComplete(goal)}
                        >
                          {goal.completed ? 'Reopen' : 'Complete'}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="icon"
                          onClick={() => handleOpenDialog(goal)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="icon"
                          onClick={() => handleDeleteGoal(goal._id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Custom dialog implementation instead of using shadcn/ui Dialog */}
      {openDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-[500px] p-6 relative">
            {/* Close button */}
            <button 
              onClick={handleCloseDialog} 
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                {editingGoal ? 'Edit Goal' : 'Create New Health Goal'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {editingGoal 
                  ? 'Update your health goal details below.'
                  : 'Set a new health goal to track your progress.'
                }
              </p>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Goal Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Lose 10 pounds"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your goal in more detail"
                    className="min-h-[80px]"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight">Weight</SelectItem>
                      <SelectItem value="exercise">Exercise</SelectItem>
                      <SelectItem value="nutrition">Nutrition</SelectItem>
                      <SelectItem value="sleep">Sleep</SelectItem>
                      <SelectItem value="hydration">Hydration</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="targetValue">Target Value</Label>
                    <Input
                      id="targetValue"
                      name="targetValue"
                      type="number"
                      value={formData.targetValue}
                      onChange={handleInputChange}
                      placeholder="e.g., 150"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currentValue">Current Value</Label>
                    <Input
                      id="currentValue"
                      name="currentValue"
                      type="number"
                      value={formData.currentValue}
                      onChange={handleInputChange}
                      placeholder="e.g., 160"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unit (Optional)</Label>
                    <Input
                      id="unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      placeholder="e.g., lbs, miles, etc."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="targetDate">Target Date (Optional)</Label>
                    <Input
                      id="targetDate"
                      name="targetDate"
                      type="date"
                      value={formData.targetDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
