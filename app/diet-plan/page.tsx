"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { ChevronRight } from "lucide-react"

// Mock user data (in a real app, this would come from a database or API)
const userData = {
  age: 30,
  weight: 70, // in kg
  height: 170, // in cm
  activityLevel: "moderate",
  healthConditions: ["none"],
  dietaryRestrictions: ["none"],
}

export default function DietPlanPage() {
  const [goalWeight, setGoalWeight] = useState(userData.weight)
  const [timeframe, setTimeframe] = useState("4")
  const [dietType, setDietType] = useState("balanced")
  const [mealCount, setMealCount] = useState(3)
  const [includeSnacks, setIncludeSnacks] = useState(true)
  const [generatedPlan, setGeneratedPlan] = useState<any>(null)

  const generateDietPlan = () => {
    // In a real application, this would make an API call to a backend service
    // that would generate a personalized diet plan based on the user's data and preferences.
    // For this example, we'll create a simple mock plan.

    const dailyCalories = calculateDailyCalories()
    const meals = generateMeals(dailyCalories)

    setGeneratedPlan({
      dailyCalories,
      meals,
    })
  }

  const calculateDailyCalories = () => {
    // This is a simplified calculation and should be more comprehensive in a real app
    const bmr = 10 * userData.weight + 6.25 * userData.height - 5 * userData.age + 5
    const activityFactor = 1.55 // Assuming moderate activity
    const maintenanceCalories = bmr * activityFactor
    const weightLossCalories = maintenanceCalories - 500 // 500 calorie deficit for weight loss

    return Math.round(weightLossCalories)
  }

  const generateMeals = (dailyCalories: number) => {
    const mealCalories = Math.floor(dailyCalories / mealCount)
    const meals = []

    for (let i = 0; i < mealCount; i++) {
      meals.push({
        name: `Meal ${i + 1}`,
        calories: mealCalories,
        protein: Math.round((mealCalories * 0.3) / 4), // 30% of calories from protein
        carbs: Math.round((mealCalories * 0.4) / 4), // 40% of calories from carbs
        fat: Math.round((mealCalories * 0.3) / 9), // 30% of calories from fat
      })
    }

    if (includeSnacks) {
      meals.push({
        name: "Snacks",
        calories: dailyCalories - mealCalories * mealCount,
        protein: Math.round(((dailyCalories - mealCalories * mealCount) * 0.2) / 4),
        carbs: Math.round(((dailyCalories - mealCalories * mealCount) * 0.6) / 4),
        fat: Math.round(((dailyCalories - mealCalories * mealCount) * 0.2) / 9),
      })
    }

    return meals
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Create Your Diet Plan</h1>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>Review and update your details for an accurate plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-weight">Current Weight (kg)</Label>
              <Input id="current-weight" type="number" value={userData.weight} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-weight">Goal Weight (kg)</Label>
              <Input
                id="goal-weight"
                type="number"
                value={goalWeight}
                onChange={(e) => setGoalWeight(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe (weeks)</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger id="timeframe">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 weeks</SelectItem>
                  <SelectItem value="8">8 weeks</SelectItem>
                  <SelectItem value="12">12 weeks</SelectItem>
                  <SelectItem value="16">16 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diet-type">Diet Type</Label>
              <Select value={dietType} onValueChange={setDietType}>
                <SelectTrigger id="diet-type">
                  <SelectValue placeholder="Select diet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="low-carb">Low Carb</SelectItem>
                  <SelectItem value="high-protein">High Protein</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meal-count">Number of Meals per Day</Label>
              <Slider
                id="meal-count"
                min={2}
                max={6}
                step={1}
                value={[mealCount]}
                onValueChange={(value) => setMealCount(value[0])}
              />
              <div className="text-center font-medium">{mealCount} meals</div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="include-snacks" checked={includeSnacks} onCheckedChange={setIncludeSnacks} />
              <Label htmlFor="include-snacks">Include Snacks</Label>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Generate Your Diet Plan</CardTitle>
            <CardDescription>Click the button below to create your personalized diet plan</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={generateDietPlan} className="w-full">
              Generate Diet Plan
            </Button>
            {generatedPlan && (
              <div className="mt-8 space-y-4">
                <h3 className="text-xl font-semibold">Your Personalized Diet Plan</h3>
                <p className="text-muted-foreground">Daily Calorie Goal: {generatedPlan.dailyCalories} kcal</p>
                {generatedPlan.meals.map((meal: any, index: number) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{meal.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm">
                        <span>Calories: {meal.calories} kcal</span>
                        <span>Protein: {meal.protein}g</span>
                        <span>Carbs: {meal.carbs}g</span>
                        <span>Fat: {meal.fat}g</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    This is a general guide. Consult a nutritionist for a more detailed plan.
                  </p>
                  <Button variant="outline" className="mt-4">
                    View Full Plan <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

