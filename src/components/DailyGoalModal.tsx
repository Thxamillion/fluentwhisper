import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DailyGoalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentGoal: number
  onSave: (newGoal: number) => void
}

export function DailyGoalModal({ open, onOpenChange, currentGoal, onSave }: DailyGoalModalProps) {
  const [goalMinutes, setGoalMinutes] = useState(currentGoal)

  const handleSave = () => {
    if (goalMinutes > 0 && goalMinutes <= 240) {
      onSave(goalMinutes)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Daily Practice Goal</DialogTitle>
          <DialogDescription>
            Set your daily speaking practice target. We'll track your progress toward this goal each day.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="goal" className="text-right">
              Minutes
            </Label>
            <Input
              id="goal"
              type="number"
              min="1"
              max="240"
              value={goalMinutes}
              onChange={(e) => setGoalMinutes(parseInt(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>
          <p className="text-xs text-muted-foreground px-4">
            Recommended: 10-30 minutes per day for consistent improvement.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={goalMinutes <= 0 || goalMinutes > 240}>
            Save Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
