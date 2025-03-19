"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { generateExercisePlan } from "@/lib/advanced-insights"
import { 
  DumbbellIcon, 
  Dumbbell, 
  SaveIcon, 
  RefreshCcw, 
  Calendar, 
  Target, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Printer, 
  Loader,
  Info,
  X,
  Check,
  Undo2
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import ReactMarkdown from 'react-markdown'
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"

type Environment = 'home' | 'gym';

interface Exercise {
  name: string;
  description: string;
  muscleGroups: string[];
  sets: number;
  reps: string;
  imageUrl?: string;
  formTips: string[];
  equipment?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface DayPlan {
  day: string;
  title: string;
  focus: string[];
  warmup: string;
  exercises: Exercise[];
  cooldown: string;
  notes?: string;
}

export default function ExercisePlanPage() {
  const [healthMetrics, setHealthMetrics] = useState<any>(null)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)
  const [generatedPlan, setGeneratedPlan] = useState<{[key in Environment]: string | null}>({
    home: null,
    gym: null
  })
  const [isGenerating, setIsGenerating] = useState<{[key in Environment]: boolean}>({
    home: false,
    gym: false
  })
  const [exerciseImages, setExerciseImages] = useState<{[key: string]: string}>({})
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [savedPlan, setSavedPlan] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Environment>('home')
  const [parsedPlan, setParsedPlan] = useState<{[key in Environment]?: DayPlan[]}>({})
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoadingPlans, setIsLoadingPlans] = useState<{[key in Environment]: boolean}>({
    home: true,
    gym: true
  })
  const printRef = useRef<HTMLDivElement>(null)
  
  const { toast } = useToast()

  // Fetch user's health metrics on component mount
  useEffect(() => {
    const fetchHealthMetrics = async () => {
      try {
        setIsLoadingMetrics(true)
        const response = await fetch('/api/health/latest', {
          cache: 'no-store',
          next: { revalidate: 0 }
        })
        
        if (!response.ok) throw new Error('Failed to fetch health metrics')
        const data = await response.json()
        
        if (data) {
          setHealthMetrics(data)
        }
      } catch (error) {
        console.error('Error fetching health metrics:', error)
        toast({
          title: "Error",
          description: "Failed to load your health data. Please try again later.",
          variant: "destructive"
        })
      } finally {
        setIsLoadingMetrics(false)
      }
    }
    
    fetchHealthMetrics()
  }, [toast])

  // Seed database with exercises on initial load
  useEffect(() => {
    const seedExerciseDatabase = async () => {
      try {
        const response = await fetch('/api/exercise/seed');
        if (response.ok) {
          console.log("Database seeding completed");
        }
      } catch (error) {
        console.error("Error seeding exercise database:", error);
      }
    };
    
    seedExerciseDatabase();
  }, []);

  // Fetch saved exercise plans on component mount
  useEffect(() => {
    const fetchSavedPlans = async () => {
      try {
        // Set loading state for both environments
        setIsLoadingPlans({
          home: true,
          gym: true
        });
        
        console.log("Fetching saved plans...");
        
        // Fetch all saved plans
        const response = await fetch('/api/exercise/save-plan', {
          cache: 'no-store',
          next: { revalidate: 0 }
        });
        
        if (!response.ok) {
          console.error("Failed to fetch saved plans:", response.status, response.statusText);
          throw new Error('Failed to fetch saved plans');
        }
        
        const data = await response.json();
        console.log("API response:", data);
        
        // Process plans if they exist
        if (data.success && data.plans && data.plans.length > 0) {
          console.log("Found saved plans:", data.plans.length);
          setSavedPlan(data.plans);
          
          // Process each plan by environment
          const homePlan = data.plans.find((p: any) => p.environment === 'home');
          const gymPlan = data.plans.find((p: any) => p.environment === 'gym');
          
          // Process home plan if it exists
          if (homePlan) {
            console.log("Processing saved home plan");
            setGeneratedPlan(prev => ({ ...prev, home: homePlan.plan }));
            const structuredPlan = parsePlanIntoStructure(homePlan.plan, 'home');
            setParsedPlan(prev => ({ ...prev, home: structuredPlan }));
            
            // Extract exercise names and generate images
            extractAndGenerateImages(homePlan.plan);
            
            // Update loading state for home
            setIsLoadingPlans(prev => ({ ...prev, home: false }));
            
            // Set default selected day for home if it's the active tab
            if (activeTab === 'home' && structuredPlan.length > 0) {
              setSelectedDay(structuredPlan[0].day);
            }
          } else {
            setIsLoadingPlans(prev => ({ ...prev, home: false }));
          }
          
          // Process gym plan if it exists
          if (gymPlan) {
            console.log("Processing saved gym plan");
            setGeneratedPlan(prev => ({ ...prev, gym: gymPlan.plan }));
            const structuredPlan = parsePlanIntoStructure(gymPlan.plan, 'gym');
            
            // Enrich gym plan with database exercises
            try {
              const enrichedPlan = await enrichPlanWithDatabaseExercises(structuredPlan, 'gym');
              setParsedPlan(prev => ({ ...prev, gym: enrichedPlan }));
              
              // Set default selected day for gym if it's the active tab
              if (activeTab === 'gym' && enrichedPlan.length > 0) {
                setSelectedDay(enrichedPlan[0].day);
              }
            } catch (error) {
              console.error("Error enriching gym plan:", error);
              // Fall back to non-enriched plan
              setParsedPlan(prev => ({ ...prev, gym: structuredPlan }));
            }
            
            // Extract exercise names and generate images
            extractAndGenerateImages(gymPlan.plan);
            
            // Update loading state for gym
            setIsLoadingPlans(prev => ({ ...prev, gym: false }));
          } else {
            setIsLoadingPlans(prev => ({ ...prev, gym: false }));
          }
        } else {
          console.log("No saved plans found");
          // Make sure to set loading state to false for both
          setIsLoadingPlans({
            home: false,
            gym: false
          });
        }
      } catch (error) {
        console.error('Error fetching saved plans:', error);
        toast({
          title: "Error",
          description: "Failed to load saved exercise plans. You can generate new ones.",
          variant: "destructive"
        });
        // Make sure to set loading state to false on error
        setIsLoadingPlans({
          home: false,
          gym: false
        });
      }
    };
    
    fetchSavedPlans();
    // This effect should only run once on mount
  }, []); // Empty dependency array to ensure it only runs once

  // Update selected day when switching tabs
  useEffect(() => {
    const currentPlan = parsedPlan[activeTab];
    if (currentPlan && currentPlan.length > 0) {
      // Only set selected day if none is selected or the current selected day doesn't exist in this plan
      if (!selectedDay || !currentPlan.some(day => day.day === selectedDay)) {
        setSelectedDay(currentPlan[0].day);
      }
    } else {
      // Reset selected day if no plan exists for this environment
      setSelectedDay(null);
    }
  }, [activeTab, parsedPlan, selectedDay]);

  // New function to replace placeholders with actual exercises from database
  const enrichPlanWithDatabaseExercises = async (parsedPlan: DayPlan[], environment: Environment): Promise<DayPlan[]> => {
    try {
      // Fetch exercises from database
      const response = await fetch(`/api/exercise/list?environment=${environment}`, {
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      
      if (!response.ok) throw new Error('Failed to fetch exercises from database');
      const data = await response.json();
      
      if (!data.success || !data.exercises || data.exercises.length === 0) {
        return parsedPlan;
      }
      
      const dbExercises = data.exercises;
      console.log(`Loaded ${dbExercises.length} exercises from database for ${environment}`);
      
      // Map to quickly look up exercises by name or muscle group
      const exerciseMap = new Map();
      const exercisesByMuscleGroup = new Map<string, Exercise[]>();
      
      dbExercises.forEach((exercise: Exercise) => {
        exerciseMap.set(exercise.name.toLowerCase(), exercise);
        
        exercise.muscleGroups.forEach(muscle => {
          if (!exercisesByMuscleGroup.has(muscle.toLowerCase())) {
            exercisesByMuscleGroup.set(muscle.toLowerCase(), []);
          }
          exercisesByMuscleGroup.get(muscle.toLowerCase())!.push(exercise);
        });
      });
      
      // For each day in the plan
      return parsedPlan.map(day => {
        // Skip rest days
        if (day.focus.some(f => f.toLowerCase().includes('rest'))) {
          return day;
        }
        
        // Find suitable exercises for each muscle group in the day's focus
        const targetMuscles = day.focus.flatMap(focus => 
          focus.split(/[,/]/).map(m => m.trim().toLowerCase())
        );
        
        // Enrich with suitable exercises
        const enrichedExercises = day.exercises.map(exercise => {
          // Try to find exact match by name
          const exactMatch = exerciseMap.get(exercise.name.toLowerCase());
          if (exactMatch) {
            return {
              ...exercise,
              muscleGroups: exactMatch.muscleGroups,
              description: exactMatch.description || exercise.description,
              formTips: exactMatch.formTips.length > 0 ? exactMatch.formTips : exercise.formTips,
              equipment: exactMatch.equipment,
              imageUrl: exactMatch.imageUrl
            };
          }
          
          // If no exact match, try to find by muscle group
          let potentialMatches: Exercise[] = [];
          
          // Try each muscle group from the day's focus
          for (const muscle of targetMuscles) {
            const muscleExercises = exercisesByMuscleGroup.get(muscle) || [];
            if (muscleExercises.length > 0) {
              potentialMatches = [...potentialMatches, ...muscleExercises];
            }
          }
          
          // If we found potential matches, use one of them
          if (potentialMatches.length > 0) {
            // Use a hash of the exercise name to consistently pick the same exercise
            const nameHash = exercise.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const selectedMatch = potentialMatches[nameHash % potentialMatches.length];
            
            return {
              ...exercise,
              name: selectedMatch.name, // Replace with actual exercise name
              muscleGroups: selectedMatch.muscleGroups,
              description: selectedMatch.description,
              formTips: selectedMatch.formTips,
              equipment: selectedMatch.equipment,
              imageUrl: selectedMatch.imageUrl
            };
          }
          
          // If no matches found, return the original exercise
          return exercise;
        });
        
        return {
          ...day,
          exercises: enrichedExercises
        };
      });
    } catch (error) {
      console.error('Error enriching plan with database exercises:', error);
      return parsedPlan;
    }
  };

  // Function to generate exercise plan
  const handleGeneratePlan = async (environment: Environment) => {
    if (!healthMetrics) {
      toast({
        title: "Missing Health Data",
        description: "Please complete your health profile before generating a plan",
        variant: "destructive"
      })
      return
    }
    
    try {
      setIsGenerating(prev => ({ ...prev, [environment]: true }))
      
      // Generate the exercise plan using AI
      const plan = await generateExercisePlan(healthMetrics, environment)
      
      // Set the generated plan in state
      setGeneratedPlan(prev => ({ ...prev, [environment]: plan }))
      
      // Parse the plan into a structured format
      const structuredPlan = parsePlanIntoStructure(plan, environment)
      
      // Enrich the plan with database exercises if it's a gym plan
      let finalPlan;
      if (environment === 'gym') {
        finalPlan = await enrichPlanWithDatabaseExercises(structuredPlan, environment);
      } else {
        finalPlan = structuredPlan;
      }
      
      // Update the parsed plan state
      setParsedPlan(prev => ({ ...prev, [environment]: finalPlan }))
      
      // Set the first day as the selected day
      if (finalPlan.length > 0) {
        setSelectedDay(finalPlan[0].day)
      }
      
      toast({
        title: "Success",
        description: `Your ${environment} exercise plan has been created!`,
      })
      
      // Extract exercise names and generate images
      extractAndGenerateImages(plan)
      
      // Automatically save the new plan
      await handleSavePlan(plan, environment);
      
    } catch (error) {
      console.error(`Error generating ${environment} plan:`, error)
      toast({
        title: "Error",
        description: `Failed to generate your ${environment} exercise plan. Please try again.`,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(prev => ({ ...prev, [environment]: false }))
    }
  }
  
  
  // Parse the markdown plan into a structured format
  const parsePlanIntoStructure = (plan: string, environment: Environment): DayPlan[] => {
    try {
      // Extract day sections with a more robust regex
      const dayRegex = /##?\s*Day (\d+)[\s\S]*?(?=##?\s*Day \d+|$)/g
      const matches = [...plan.matchAll(dayRegex)]
      
      return matches.map(match => {
        const dayContent = match[0]
        const dayNum = match[1]
        
        // Extract title/focus
        const titleMatch = dayContent.match(/##?\s*Day \d+:?\s*(.*)/i)
        const title = titleMatch ? titleMatch[1].trim() : 'Workout Day'
        
        // Extract focus areas
        const focusMatch = dayContent.match(/[Ff]ocus:?\s*([^.\n]+)/i)
        const focus = focusMatch 
          ? focusMatch[1].trim().split(/[,/]/).map(f => f.trim())
          : (title.toLowerCase().includes('rest') ? ['Rest', 'Recovery'] : ['Full Body'])
        
        // Extract exercise blocks - look for bold text followed by details
        const exerciseBlocks = dayContent.match(/\*\*([^*]+)\*\*[\s\S]*?(?=\*\*|$)/g) || []
        
        const exercises: Exercise[] = exerciseBlocks.map(block => {
          // Extract name (from bold text)
          const nameMatch = block.match(/\*\*([^*]+)\*\*/)
          const name = nameMatch ? nameMatch[1].trim() : 'Exercise'
          
          // Extract description
          const descriptionMatch = block.match(/\*\*[^*]+\*\*\s*-\s*([^•\n]+)/)
          const description = descriptionMatch ? descriptionMatch[1].trim() : ''
          
          // Extract muscle groups
          const muscleMatch = block.match(/[Tt]arget[s]?:?\s*([^•\n\.]+)/i) || 
                             block.match(/[Mm]uscles?:?\s*([^•\n\.]+)/i)
          const muscleGroups = muscleMatch 
            ? muscleMatch[1].trim().split(/[,/]/).map(m => m.trim()) 
            : []
          
          // Extract sets
          const setsMatch = block.match(/[Ss]ets:?\s*(\d+)/i)
          const sets = setsMatch ? parseInt(setsMatch[1]) : 3
          
          // Extract reps
          const repsMatch = block.match(/[Rr]eps:?\s*(\d+(?:-\d+)?(?:\s*(?:per\s*side|each|reps|repetitions))?)/i)
          const reps = repsMatch ? repsMatch[1].trim() : '10-12'
          
          // Extract form tips
          const formTipsRegex = /[Ff]orm [Tt]ips?:?\s*([^•\n\.]+)|[Tt]ips?:?\s*([^•\n\.]+)|[Cc]ues?:?\s*([^•\n\.]+)/g
          let formTipsMatches
          const formTips: string[] = []
          
          while ((formTipsMatches = formTipsRegex.exec(block)) !== null) {
            const tip = formTipsMatches[1] || formTipsMatches[2] || formTipsMatches[3]
            if (tip) formTips.push(tip.trim())
          }
          
          // Also look for bulleted lists which often contain form tips
          const bulletPoints = block.match(/[•\-*]\s*([^\n•\-*]+)/g)
          if (bulletPoints) {
            bulletPoints.forEach(point => {
              formTips.push(point.replace(/^[•\-*]\s*/, '').trim())
            })
          }
          
          // Extract equipment
          const equipmentMatch = block.match(/[Ee]quipment:?\s*([^•\n\.]+)/i)
          const equipment = equipmentMatch 
            ? equipmentMatch[1].trim().split(/[,/]/).map(e => e.trim()) 
            : []
          
          // Determine difficulty based on sets/reps or explicit statement
          let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
          if (block.toLowerCase().includes('beginner')) {
            difficulty = 'beginner'
          } else if (block.toLowerCase().includes('advanced')) {
            difficulty = 'advanced'
          } else if (sets > 4 || reps.includes('15')) {
            difficulty = 'advanced'
          } else if (sets < 3 || reps.includes('8')) {
            difficulty = 'beginner'
          }
          
          return {
            name,
            description,
            muscleGroups,
            sets,
            reps,
            formTips,
            equipment,
            difficulty
          }
        })
        
        // Filter out any empty exercises (no name)
        const validExercises = exercises.filter(ex => ex.name && ex.name !== 'Exercise')
        
        // Extract warmup
        const warmupMatch = dayContent.match(/[Ww]arm[ -]?up:?\s*([^#\n]+)/i)
        const warmup = warmupMatch ? warmupMatch[1].trim() : '5-10 minutes of light cardio and dynamic stretching'
        
        // Extract cooldown
        const cooldownMatch = dayContent.match(/[Cc]ool[ -]?down:?\s*([^#\n]+)/i)
        const cooldown = cooldownMatch ? cooldownMatch[1].trim() : 'Static stretching for muscles worked, 5-10 minutes'
        
        // Any additional notes
        const notesMatch = dayContent.match(/[Nn]otes?:?\s*([^#\n]+)/i)
        const notes = notesMatch ? notesMatch[1].trim() : undefined
        
        return {
          day: `Day ${dayNum}`,
          title: title.includes(':') ? title.split(':')[1].trim() : title,
          focus,
          warmup,
          exercises: validExercises,
          cooldown,
          notes
        }
      })
    } catch (error) {
      console.error('Error parsing plan data:', error)
      return []
    }
  }
  
  // Helper function to extract exercise names and generate images
  const extractAndGenerateImages = async (plan: string) => {
    try {
      // Simple regex to extract exercise names - this is a basic approach and might need refinement
      const exerciseRegex = /\*\*([^*]+)\*\*/g
      const matches = [...plan.matchAll(exerciseRegex)]
      
      if (!matches || matches.length === 0) return
      
      // Get unique exercise names
      const uniqueExercises = [...new Set(matches.map(m => m[1].trim()))]
        .filter(Boolean) // Remove empty strings
        .slice(0, 5)
      
      if (uniqueExercises.length === 0) return
      
      setIsLoadingImages(true)
      
      // Call the API endpoint to generate images
      try {
        const response = await fetch('/api/exercise/generate-plan-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exerciseNames: uniqueExercises,
          }),
        })
        
        if (!response.ok) throw new Error('Failed to generate images')
        
        const data = await response.json()
        
        if (data.success && data.images) {
          setExerciseImages(data.images)
          console.log("Exercise images loaded:", Object.keys(data.images).length)
        }
      } catch (error) {
        console.error('Error calling image generation API:', error)
      } finally {
        setIsLoadingImages(false)
      }
    } catch (error) {
      console.error('Error processing exercise names:', error)
      setIsLoadingImages(false)
    }
  }

  // Function to handle saving the plan
  const handleSavePlan = async (planToSave?: string, envToSave?: Environment) => {
    // Use provided parameters or fall back to current state values
    const environment = envToSave || activeTab;
    const plan = planToSave || generatedPlan[environment];
    
    if (!plan) {
      console.error("No plan available to save");
      return;
    }
    
    setIsSaving(true);
    try {
      console.log(`Saving ${environment} plan...`);
      const response = await fetch('/api/exercise/save-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan,
          environment: environment
        }),
      });
      
      if (!response.ok) throw new Error('Failed to save exercise plan');
      
      const data = await response.json();
      
      // Update the savedPlan state with the new plan
      setSavedPlan((prev: any[]) => {
        if (Array.isArray(prev)) {
          // If we already have plans, update or add the new one
          const existingPlanIndex = prev.findIndex(p => p.environment === environment);
          if (existingPlanIndex >= 0) {
            // Update existing plan
            const updated = [...prev];
            updated[existingPlanIndex] = data.plan;
            return updated;
          } else {
            // Add new plan
            return [...prev, data.plan];
          }
        } else {
          // First plan
          return [data.plan];
        }
      });
      
      toast({
        title: "Plan Saved",
        description: `Your ${environment} exercise plan has been saved successfully!`,
      });
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: "Failed to save your exercise plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Function to print plan
  const handlePrintPlan = () => {
    if (!printRef.current) return
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    // Get styles from current page
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n')
        } catch (e) {
          return ''
        }
      })
      .join('\n')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workout Plan</title>
          <style>${styles}</style>
          <style>
            body { padding: 20px; font-family: system-ui, sans-serif; }
            .exercise-card { border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; break-inside: avoid; }
            .page-break { page-break-after: always; }
            h1, h2, h3 { color: #333; }
            .focus-badge { background: #f3f4f6; padding: 5px 10px; border-radius: 9999px; margin-right: 5px; }
            .exercise-image { max-width: 200px; height: auto; }
            .tips-list { margin-left: 20px; }
          </style>
        </head>
        <body>
          <h1>${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workout Plan</h1>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `)

    // Trigger print dialog
    printWindow.document.close()
    printWindow.focus()
    
    // Add small delay to ensure styles are loaded
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }
  
  // Helper function to get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  // Helper function to get muscle group colors
  const getMuscleGroupColor = (muscleGroup: string) => {
    const lowercase = muscleGroup.toLowerCase();
    if (lowercase.includes('chest') || lowercase.includes('pectoral')) 
      return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300';
    if (lowercase.includes('back') || lowercase.includes('lat')) 
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300';
    if (lowercase.includes('leg') || lowercase.includes('quad') || lowercase.includes('hamstring') || lowercase.includes('glute')) 
      return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300';
    if (lowercase.includes('shoulder') || lowercase.includes('delt')) 
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300';
    if (lowercase.includes('arm') || lowercase.includes('bicep') || lowercase.includes('tricep')) 
      return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300';
    if (lowercase.includes('core') || lowercase.includes('ab')) 
      return 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300';
    
    return 'bg-gray-50 text-gray-700 dark:bg-gray-800/40 dark:text-gray-300';
  }

  // Handle exercise click
  const handleExerciseClick = (exercise: Exercise) => {
    setSelectedExercise({...exercise, imageUrl: exerciseImages[exercise.name]})
    setIsDialogOpen(true)
  }

  // Add this debug function to help troubleshoot
  useEffect(() => {
    if (parsedPlan.home || parsedPlan.gym) {
      console.log("Current parsed plan:", parsedPlan)
      console.log("Selected day:", selectedDay)
      
      const currentEnvironment = activeTab as Environment
      const currentPlan = parsedPlan[currentEnvironment]
      
      if (currentPlan && selectedDay) {
        const selectedDayPlan = currentPlan.find(day => day.day === selectedDay)
        console.log("Selected day plan:", selectedDayPlan)
        console.log("Exercises for selected day:", selectedDayPlan?.exercises?.length || 0)
      }
    }
  }, [parsedPlan, selectedDay, activeTab])

  // useEffect to seed the database with exercises when the page loads
  useEffect(() => {
    const seedExerciseDatabase = async () => {
      try {
        const response = await fetch('/api/exercise/seed');
        if (response.ok) {
          const data = await response.json();
          console.log("Database seeding result:", data);
        }
      } catch (error) {
        console.error("Error seeding exercise database:", error);
      }
    };
    
    seedExerciseDatabase();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Personalized Exercise Plan</h1>
          <p className="text-muted-foreground">Custom workouts designed for your fitness level and goals</p>
        </div>
        
        <div className="flex items-center gap-2">
          {(generatedPlan.home || generatedPlan.gym) && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrintPlan}
                className="gap-1"
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:block">Print</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleSavePlan(generatedPlan[activeTab]!, activeTab)}
                disabled={!generatedPlan[activeTab] || isSaving}
                className="gap-1"
              >
                <SaveIcon className="h-4 w-4" />
                <span className="hidden sm:block">{isSaving ? "Saving..." : "Save"}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Health metrics and quick guide */}
      <Card>
        <CardHeader>
          <CardTitle>Your Health Profile</CardTitle>
          <CardDescription>Used to create your personalized plan</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : healthMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between p-2 border rounded">
                <span className="font-medium">Age:</span>
                <span>{healthMetrics.age} years</span>
              </div>
              <div className="flex justify-between p-2 border rounded">
                <span className="font-medium">Gender:</span>
                <span>{healthMetrics.gender}</span>
              </div>
              <div className="flex justify-between p-2 border rounded">
                <span className="font-medium">Height:</span>
                <span>{healthMetrics.height} cm</span>
              </div>
              <div className="flex justify-between p-2 border rounded">
                <span className="font-medium">Weight:</span>
                <span>{healthMetrics.weight} kg</span>
              </div>
              <div className="flex justify-between p-2 border rounded">
                <span className="font-medium">Activity Level:</span>
                <span>{healthMetrics.activityLevel}</span>
              </div>
              <div className="flex justify-between p-2 border rounded">
                <span className="font-medium">Fitness Goals:</span>
                <span>{healthMetrics.fitnessGoals || "Not specified"}</span>
              </div>
            </div>
          ) : (
            <div className="text-center p-4">
              <p>No health metrics available. Please complete your health profile.</p>
              <Button variant="outline" className="mt-2" onClick={() => window.location.href = '/initial-health-form'}>
                Complete Health Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Exercise Plan Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value as Environment);
        }} 
        className="space-y-6"
      >
        <TabsList className="grid w-full md:w-96 grid-cols-2">
          <TabsTrigger value="home" className="flex items-center gap-2">
            <DumbbellIcon className="h-4 w-4" />
            <span>Home Workout</span>
          </TabsTrigger>
          <TabsTrigger value="gym" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            <span>Gym Workout</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Home Tab Content */}
        <TabsContent value="home">
          {isLoadingPlans.home ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/10">
              <Skeleton className="h-24 w-24 rounded-full mb-4" />
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-10 w-40" />
            </div>
          ) : !parsedPlan.home || parsedPlan.home.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <DumbbellIcon className="h-16 w-16 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-bold mb-2">Create Your Home Workout Plan</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Generate a customized exercise plan designed specifically for your fitness level and goals, using minimal equipment at home.
                </p>
                <Button 
                  size="lg"
                  onClick={() => handleGeneratePlan('home')}
                  disabled={isGenerating.home || isLoadingMetrics || !healthMetrics}
                  className="gap-2"
                >
                  {isGenerating.home 
                    ? <>Generating <Loader className="h-4 w-4 animate-spin" /></> 
                    : <>Generate Home Plan <ChevronRight className="h-4 w-4" /></>
                  }
                </Button>
              </motion.div>
            </div>
          ) : (
            <div ref={printRef} className="space-y-6">
              {/* Day selection tabs */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Your 7-Day Home Workout Plan</h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleGeneratePlan('home')}
                    disabled={isGenerating.home}
                    className="gap-1"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">{isGenerating.home ? "Generating..." : "Regenerate Plan"}</span>
                  </Button>
                </div>
                
                {/* Only show day selection if we have days in the plan */}
                {parsedPlan.home && parsedPlan.home.length > 0 && (
                  <div className="overflow-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                      {parsedPlan.home.map((day, index) => (
                        <motion.button
                          key={day.day}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedDay(day.day)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-1 transition-colors",
                            selectedDay === day.day
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {day.day}
                          {day.focus.includes('Rest') && <span> (Rest)</span>}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Day Content */}
              {selectedDay && parsedPlan.home && (
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={selectedDay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Day Overview */}
                    {parsedPlan.home
                      .filter(day => day.day === selectedDay)
                      .map((dayPlan, index) => (
                        <div key={dayPlan.day} className="space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-2xl font-bold">{dayPlan.title}</h3>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {dayPlan.focus.map(area => (
                                  <Badge key={area} variant="secondary">{area}</Badge>
                                ))}
                              </div>
                            </div>
                            
                            {dayPlan.focus.includes('Rest') ? (
                              <div className="text-sm text-muted-foreground">
                                <p>Today is a rest day. Give your muscles time to recover.</p>
                              </div>
                            ) : (
                              <div className="flex flex-col xs:flex-row gap-2 text-sm">
                                <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>~45-60 min</span>
                                </div>
                                <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded">
                                  <Target className="h-4 w-4 text-muted-foreground" />
                                  <span>{dayPlan.exercises.length} Exercises</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Warm-up, Cool-down, Notes Section */}
                          {!dayPlan.focus.includes('Rest') && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <Card className="lg:col-span-1">
                                <CardHeader className="bg-amber-50 dark:bg-amber-950/20">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <span className="bg-amber-100 dark:bg-amber-900 p-1 rounded">🔥</span>
                                    Warm-up (5-10 min)
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                  <p className="text-sm">{dayPlan.warmup}</p>
                                </CardContent>
                              </Card>

                              <Card className="lg:col-span-1">
                                <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <span className="bg-blue-100 dark:bg-blue-900 p-1 rounded">❄️</span>
                                    Cool-down (5-10 min)
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                  <p className="text-sm">{dayPlan.cooldown}</p>
                                </CardContent>
                              </Card>

                              <Card className="lg:col-span-1">
                                <CardHeader className="bg-violet-50 dark:bg-violet-950/20">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <span className="bg-violet-100 dark:bg-violet-900 p-1 rounded">📝</span>
                                    Training Notes
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                  <p className="text-sm">
                                    {dayPlan.notes || "Focus on maintaining proper form throughout each exercise. Rest 60-90 seconds between sets."}
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                          )}

                          {/* Exercise Cards */}
                          {!dayPlan.focus.includes('Rest') && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Exercise Plan</h3>
                                <span className="text-sm text-muted-foreground">Click an exercise for details</span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {dayPlan.exercises.map((exercise, idx) => {
                                  const exerciseImage = exerciseImages[exercise.name];
                                  return (
                                    <motion.div
                                      key={`${exercise.name}-${idx}`}
                                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                      className="group cursor-pointer"
                                      onClick={() => handleExerciseClick(exercise)}
                                    >
                                      <Card className="overflow-hidden border-2 transition-all duration-300 hover:border-primary hover:shadow-md">
                                        <div className="relative h-48 w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                                          {exerciseImage ? (
                                            <Image
                                              src={exerciseImage}
                                              alt={exercise.name}
                                              fill
                                              className="object-cover"
                                            />
                                          ) : isLoadingImages ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                          ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                              <DumbbellIcon className="h-16 w-16 mb-2 text-muted-foreground/50" />
                                              <p className="text-sm text-muted-foreground">Image not available</p>
                                            </div>
                                          )}
                                          
                                          {/* Difficulty badge */}
                                          <div className="absolute top-3 right-3">
                                            <Badge className={cn("capitalize", getDifficultyColor(exercise.difficulty))}>
                                              {exercise.difficulty}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-lg line-clamp-1">
                                            {exercise.name}
                                          </CardTitle>
                                          <CardDescription className="line-clamp-1">
                                            {exercise.muscleGroups.join(', ')}
                                          </CardDescription>
                                        </CardHeader>
                                        
                                        <CardContent className="pb-4">
                                          <div className="flex justify-between text-sm">
                                            <div className="flex items-center gap-1.5">
                                              <span className="bg-primary/10 p-1 rounded-full">
                                                <DumbbellIcon className="h-3 w-3 text-primary" />
                                              </span>
                                              <span>{exercise.sets} sets</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="bg-primary/10 p-1 rounded-full">
                                                <ChevronUp className="h-3 w-3 text-primary" />
                                              </span>
                                              <span>{exercise.reps} reps</span>
                                            </div>
                                          </div>
                                        </CardContent>
                                        
                                        <div className="px-6 pb-4 pt-0">
                                          <Button 
                                            variant="ghost" 
                                            className="w-full text-xs flex justify-between items-center"
                                          >
                                            <span>View details</span>
                                            <Info className="h-3.5 w-3.5 opacity-70" />
                                          </Button>
                                        </div>
                                      </Card>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}
        </TabsContent>
        
        {/* Gym Tab Content */}
        <TabsContent value="gym">
          {isLoadingPlans.gym ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/10">
              <Skeleton className="h-24 w-24 rounded-full mb-4" />
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-10 w-40" />
            </div>
          ) : !parsedPlan.gym || parsedPlan.gym.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-muted/10">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Dumbbell className="h-16 w-16 text-muted-foreground mb-6" />
                <h2 className="text-2xl font-bold mb-2">Create Your Gym Workout Plan</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Generate a customized exercise plan optimized for your fitness level, using standard gym equipment.
                </p>
                <Button 
                  size="lg"
                  onClick={() => handleGeneratePlan('gym')}
                  disabled={isGenerating.gym || isLoadingMetrics || !healthMetrics}
                  className="gap-2"
                >
                  {isGenerating.gym 
                    ? <>Generating <Loader className="h-4 w-4 animate-spin" /></> 
                    : <>Generate Gym Plan <ChevronRight className="h-4 w-4" /></>
                  }
                </Button>
              </motion.div>
            </div>
          ) : (
            <div ref={printRef} className="space-y-6">
              {/* Day selection tabs */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Your 7-Day Gym Workout Plan</h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleGeneratePlan('gym')}
                    disabled={isGenerating.gym}
                    className="gap-1"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">{isGenerating.gym ? "Generating..." : "Regenerate Plan"}</span>
                  </Button>
                </div>
                
                {/* Only show day selection if we have days in the plan */}
                {parsedPlan.gym && parsedPlan.gym.length > 0 && (
                  <div className="overflow-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                      {parsedPlan.gym.map((day, index) => (
                        <motion.button
                          key={day.day}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedDay(day.day)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-1 transition-colors",
                            selectedDay === day.day
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          {day.day}
                          {day.focus.includes('Rest') && <span> (Rest)</span>}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Selected Day Content */}
              {selectedDay && parsedPlan.gym && (
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={selectedDay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Day Overview */}
                    {parsedPlan.gym
                      .filter(day => day.day === selectedDay)
                      .map((dayPlan, index) => (
                        <div key={dayPlan.day} className="space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h3 className="text-2xl font-bold">{dayPlan.title}</h3>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {dayPlan.focus.map(area => (
                                  <Badge key={area} variant="secondary">{area}</Badge>
                                ))}
                              </div>
                            </div>
                            
                            {dayPlan.focus.includes('Rest') ? (
                              <div className="text-sm text-muted-foreground">
                                <p>Today is a rest day. Give your muscles time to recover.</p>
                              </div>
                            ) : (
                              <div className="flex flex-col xs:flex-row gap-2 text-sm">
                                <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>~45-60 min</span>
                                </div>
                                <div className="flex items-center gap-1 bg-muted/50 px-3 py-1 rounded">
                                  <Target className="h-4 w-4 text-muted-foreground" />
                                  <span>{dayPlan.exercises.length} Exercises</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Warm-up, Cool-down, Notes Section */}
                          {!dayPlan.focus.includes('Rest') && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <Card className="lg:col-span-1">
                                <CardHeader className="bg-amber-50 dark:bg-amber-950/20">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <span className="bg-amber-100 dark:bg-amber-900 p-1 rounded">🔥</span>
                                    Warm-up (5-10 min)
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                  <p className="text-sm">{dayPlan.warmup}</p>
                                </CardContent>
                              </Card>

                              <Card className="lg:col-span-1">
                                <CardHeader className="bg-blue-50 dark:bg-blue-950/20">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <span className="bg-blue-100 dark:bg-blue-900 p-1 rounded">❄️</span>
                                    Cool-down (5-10 min)
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                  <p className="text-sm">{dayPlan.cooldown}</p>
                                </CardContent>
                              </Card>

                              <Card className="lg:col-span-1">
                                <CardHeader className="bg-violet-50 dark:bg-violet-950/20">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <span className="bg-violet-100 dark:bg-violet-900 p-1 rounded">📝</span>
                                    Training Notes
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                  <p className="text-sm">
                                    {dayPlan.notes || "Focus on maintaining proper form throughout each exercise. Rest 60-90 seconds between sets."}
                                  </p>
                                </CardContent>
                              </Card>
                            </div>
                          )}

                          {/* Exercise Cards */}
                          {!dayPlan.focus.includes('Rest') && dayPlan.exercises.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Exercise Plan</h3>
                                <span className="text-sm text-muted-foreground">Click an exercise for details</span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {dayPlan.exercises.map((exercise, idx) => {
                                  const exerciseImage = exercise.imageUrl || exerciseImages[exercise.name];
                                  return (
                                    <motion.div
                                      key={`${exercise.name}-${idx}`}
                                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                      className="group cursor-pointer"
                                      onClick={() => handleExerciseClick(exercise)}
                                    >
                                      <Card className="overflow-hidden border-2 transition-all duration-300 hover:border-primary hover:shadow-md">
                                        <div className="relative h-48 w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                                          {exerciseImage ? (
                                            <Image
                                              src={exerciseImage}
                                              alt={exercise.name}
                                              fill
                                              className="object-cover"
                                            />
                                          ) : isLoadingImages ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                          ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                              <DumbbellIcon className="h-16 w-16 mb-2 text-muted-foreground/50" />
                                              <p className="text-sm text-muted-foreground">Image not available</p>
                                            </div>
                                          )}
                                          
                                          {/* Difficulty badge */}
                                          <div className="absolute top-3 right-3">
                                            <Badge className={cn("capitalize", getDifficultyColor(exercise.difficulty))}>
                                              {exercise.difficulty}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        <CardHeader className="pb-2">
                                          <CardTitle className="text-lg line-clamp-1">
                                            {exercise.name}
                                          </CardTitle>
                                          <CardDescription className="line-clamp-1">
                                            {exercise.muscleGroups.join(', ')}
                                          </CardDescription>
                                        </CardHeader>
                                        
                                        <CardContent className="pb-4">
                                          <div className="flex justify-between text-sm">
                                            <div className="flex items-center gap-1.5">
                                              <span className="bg-primary/10 p-1 rounded-full">
                                                <DumbbellIcon className="h-3 w-3 text-primary" />
                                              </span>
                                              <span>{exercise.sets} sets</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="bg-primary/10 p-1 rounded-full">
                                                <ChevronUp className="h-3 w-3 text-primary" />
                                              </span>
                                              <span>{exercise.reps}</span>
                                            </div>
                                          </div>
                                        </CardContent>
                                        
                                        <div className="px-6 pb-4 pt-0">
                                          <Button 
                                            variant="ghost" 
                                            className="w-full text-xs flex justify-between items-center"
                                          >
                                            <span>View details</span>
                                            <Info className="h-3.5 w-3.5 opacity-70" />
                                          </Button>
                                        </div>
                                      </Card>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Exercise Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <DialogTitle className="text-2xl">{selectedExercise?.name}</DialogTitle>
                <DialogDescription>
                  {selectedExercise?.muscleGroups.join(', ')}
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          
          {selectedExercise && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-auto">
              {/* Exercise Image */}
              <div className="bg-muted/30 rounded-lg overflow-hidden relative">
                <div className="aspect-video relative">
                  {selectedExercise.imageUrl ? (
                    <Image
                      src={selectedExercise.imageUrl}
                      alt={selectedExercise.name}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <DumbbellIcon className="h-16 w-16 mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">No image available</p>
                    </div>
                  )}
                </div>
                
                {/* Difficulty badge */}
                <div className="absolute top-3 right-3">
                  <Badge className={cn("capitalize", getDifficultyColor(selectedExercise.difficulty))}>
                    {selectedExercise.difficulty}
                  </Badge>
                </div>
              </div>
              
              {/* Exercise Details */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p>{selectedExercise.description || "Perform this exercise with controlled movements."}</p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Sets</h4>
                    <p className="text-2xl font-bold">{selectedExercise.sets}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Reps</h4>
                    <p className="text-2xl font-bold">{selectedExercise.reps}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Muscle Groups</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedExercise.muscleGroups.map(muscle => (
                      <Badge key={muscle} className={getMuscleGroupColor(muscle)} variant="outline">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {selectedExercise.equipment && selectedExercise.equipment.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Equipment</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedExercise.equipment.map(item => (
                          <Badge key={item} variant="outline">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {/* Form Tips */}
              <div className="md:col-span-2">
                <Card>
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="text-base">Form Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {selectedExercise.formTips.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedExercise.formTips.map((tip, idx) => (
                          <motion.li 
                            key={idx}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex gap-2 items-start"
                          >
                            <Check className="h-4 w-4 mt-1 text-green-600" />
                            <span>{tip}</span>
                          </motion.li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">
                        Focus on maintaining proper form throughout this exercise. 
                        Keep movements controlled and engage the target muscles.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
