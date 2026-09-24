/**
 * Reference catalog for the Gym exercise dropdown and muscle-target display.
 * Not a DB table — the `exercises` table has no muscle-target column (see
 * CLAUDE.md schema rules), so this stays purely client-side. Matching is by
 * exact name (case-insensitive) against `exercises.name`; a custom exercise
 * name that isn't in here just renders without a target line.
 */

export const EXERCISE_CATEGORIES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Full Body',
  'Mobility & Cardio',
]

export const EXERCISE_CATALOG = [
  // Chest
  { name: 'Barbell bench press', category: 'Chest', target: 'Chest (mid) primary · front delts, triceps secondary' },
  { name: 'Incline barbell bench press', category: 'Chest', target: 'Chest (upper) primary · front delts, triceps secondary' },
  { name: 'Decline bench press', category: 'Chest', target: 'Chest (lower) primary · triceps secondary' },
  { name: 'Incline DB press (30°)', category: 'Chest', target: 'Chest (upper) primary · front delts, triceps secondary' },
  { name: 'Flat DB press', category: 'Chest', target: 'Chest (mid) primary · front delts, triceps secondary' },
  { name: 'Cable chest fly', category: 'Chest', target: 'Chest (inner/stretch) primary' },
  { name: 'DB flyes', category: 'Chest', target: 'Chest (stretch) primary' },
  { name: 'Cable crossover', category: 'Chest', target: 'Chest (inner) primary' },
  { name: 'Pec deck machine', category: 'Chest', target: 'Chest (isolation) primary' },
  { name: 'Dips (chest-focused)', category: 'Chest', target: 'Chest (lower) primary · triceps secondary' },
  { name: 'Push-ups', category: 'Chest', target: 'Chest primary · front delts, triceps, core secondary' },
  { name: 'Landmine press', category: 'Chest', target: 'Chest (upper), front delts primary' },

  // Back
  { name: 'Deadlift', category: 'Back', target: 'Erectors, glutes, hamstrings primary · lats, traps secondary' },
  { name: 'Rack pulls', category: 'Back', target: 'Traps, upper back primary · grip secondary' },
  { name: 'Barbell row', category: 'Back', target: 'Lats, rhomboids, traps primary · biceps secondary' },
  { name: 'Pendlay row', category: 'Back', target: 'Lats, mid-back primary' },
  { name: 'T-bar row', category: 'Back', target: 'Mid-back, lats primary · biceps secondary' },
  { name: 'Seated cable row', category: 'Back', target: 'Mid-back, rhomboids primary · biceps secondary' },
  { name: 'Cable row (close grip)', category: 'Back', target: 'Mid-back primary' },
  { name: 'Single-arm DB row', category: 'Back', target: 'Lats, mid-back primary · biceps secondary' },
  { name: 'Lat pulldown (wide)', category: 'Back', target: 'Lats primary · biceps secondary' },
  { name: 'Lat pulldown (close grip)', category: 'Back', target: 'Lats (lower fibers) primary · biceps secondary' },
  { name: 'Straight-arm pulldown', category: 'Back', target: 'Lats (isolation) primary' },
  { name: 'Weighted pull-ups', category: 'Back', target: 'Lats primary · biceps, rear delts secondary' },
  { name: 'Pull-ups', category: 'Back', target: 'Lats primary · biceps secondary' },
  { name: 'Chin-ups', category: 'Back', target: 'Lats primary · biceps secondary (more bicep bias than pull-ups)' },
  { name: 'Face pull', category: 'Back', target: 'Rear delts, rotator cuff primary' },
  { name: 'Good mornings', category: 'Back', target: 'Erectors, hamstrings primary · glutes secondary' },
  { name: 'Meadows row', category: 'Back', target: 'Lats, mid-back primary' },

  // Shoulders
  { name: 'Seated OHP', category: 'Shoulders', target: 'Front, side delts primary · triceps secondary' },
  { name: 'Overhead press', category: 'Shoulders', target: 'Front, side delts primary · triceps secondary' },
  { name: 'Standing barbell press', category: 'Shoulders', target: 'Front delts primary · core, triceps secondary' },
  { name: 'Arnold press', category: 'Shoulders', target: 'Front, side delts primary · triceps secondary' },
  { name: 'DB shoulder press', category: 'Shoulders', target: 'Front, side delts primary · triceps secondary' },
  { name: 'DB lateral raise', category: 'Shoulders', target: 'Side delts primary' },
  { name: 'Cable lateral raise', category: 'Shoulders', target: 'Side delts (constant tension) primary' },
  { name: 'Front raise', category: 'Shoulders', target: 'Front delts primary' },
  { name: 'Rear delt fly', category: 'Shoulders', target: 'Rear delts primary' },
  { name: 'Upright row', category: 'Shoulders', target: 'Side delts, traps primary' },
  { name: 'Bradford press', category: 'Shoulders', target: 'Side, front delts primary' },
  { name: 'Cuban press', category: 'Shoulders', target: 'Rear delts, rotator cuff, side delts primary' },

  // Biceps
  { name: 'Barbell curl', category: 'Biceps', target: 'Biceps (both heads) primary' },
  { name: 'EZ-bar curl', category: 'Biceps', target: 'Biceps primary · forearms secondary' },
  { name: 'Dumbbell curl', category: 'Biceps', target: 'Biceps primary' },
  { name: 'Hammer curl', category: 'Biceps', target: 'Brachialis, forearms primary · biceps secondary' },
  { name: 'Preacher curl', category: 'Biceps', target: 'Biceps (lower/short head) primary' },
  { name: 'Concentration curl', category: 'Biceps', target: 'Biceps (peak) primary' },
  { name: 'Incline DB curl', category: 'Biceps', target: 'Biceps (long head, stretch) primary' },
  { name: 'Cable curl', category: 'Biceps', target: 'Biceps (constant tension) primary' },
  { name: 'Spider curl', category: 'Biceps', target: 'Biceps (short head, peak) primary' },
  { name: 'Zottman curl', category: 'Biceps', target: 'Biceps, brachialis primary · forearms secondary' },

  // Triceps
  { name: 'Tricep pushdown (rope)', category: 'Triceps', target: 'Triceps (lateral head) primary' },
  { name: 'Tricep pushdown (bar)', category: 'Triceps', target: 'Triceps primary' },
  { name: 'Overhead tricep extension', category: 'Triceps', target: 'Triceps (long head) primary' },
  { name: 'Skull crushers', category: 'Triceps', target: 'Triceps (long head) primary' },
  { name: 'Close-grip bench press', category: 'Triceps', target: 'Triceps primary · chest secondary' },
  { name: 'Dips (triceps-focused)', category: 'Triceps', target: 'Triceps primary · chest secondary' },
  { name: 'Cable kickback', category: 'Triceps', target: 'Triceps (isolation) primary' },
  { name: 'DB kickback', category: 'Triceps', target: 'Triceps (isolation) primary' },
  { name: 'JM press', category: 'Triceps', target: 'Triceps primary' },

  // Quads
  { name: 'Back squat', category: 'Quads', target: 'Quads primary · glutes, hamstrings secondary' },
  { name: 'Front squat', category: 'Quads', target: 'Quads primary (upright torso) · core secondary' },
  { name: 'Leg press', category: 'Quads', target: 'Quads primary · glutes secondary' },
  { name: 'Hack squat', category: 'Quads', target: 'Quads (isolation-leaning) primary' },
  { name: 'Walking DB lunges', category: 'Quads', target: 'Quads, glutes primary' },
  { name: 'Bulgarian split squat', category: 'Quads', target: 'Quads, glutes primary (unilateral)' },
  { name: 'Leg extension', category: 'Quads', target: 'Quads (isolation) primary' },
  { name: 'Goblet squat', category: 'Quads', target: 'Quads primary · core, glutes secondary' },
  { name: 'Step-ups', category: 'Quads', target: 'Quads, glutes primary (unilateral)' },
  { name: 'Sissy squat', category: 'Quads', target: 'Quads (rectus femoris) primary' },

  // Hamstrings
  { name: 'Romanian deadlift', category: 'Hamstrings', target: 'Hamstrings, glutes primary' },
  { name: 'Stiff-leg deadlift', category: 'Hamstrings', target: 'Hamstrings primary · erectors secondary' },
  { name: 'Seated leg curl', category: 'Hamstrings', target: 'Hamstrings (isolation) primary' },
  { name: 'Lying leg curl', category: 'Hamstrings', target: 'Hamstrings (isolation) primary' },
  { name: 'Nordic curl', category: 'Hamstrings', target: 'Hamstrings (eccentric) primary' },
  { name: 'Single-leg RDL', category: 'Hamstrings', target: 'Hamstrings, glutes primary · balance/core secondary' },
  { name: 'Glute-ham raise', category: 'Hamstrings', target: 'Hamstrings, glutes primary' },

  // Glutes
  { name: 'Hip thrust', category: 'Glutes', target: 'Glutes primary · hamstrings secondary' },
  { name: 'Glute bridge', category: 'Glutes', target: 'Glutes primary' },
  { name: 'Cable pull-through', category: 'Glutes', target: 'Glutes, hamstrings primary' },
  { name: 'Sumo deadlift', category: 'Glutes', target: 'Glutes, adductors primary · hamstrings secondary' },
  { name: 'Curtsy lunge', category: 'Glutes', target: 'Glutes (medius) primary · quads secondary' },
  { name: 'Cable glute kickback', category: 'Glutes', target: 'Glutes (isolation) primary' },

  // Calves
  { name: 'Standing calf raise', category: 'Calves', target: 'Calves (gastrocnemius) primary' },
  { name: 'Seated calf raise', category: 'Calves', target: 'Calves (soleus) primary' },
  { name: 'Leg press calf raise', category: 'Calves', target: 'Calves primary' },
  { name: 'Donkey calf raise', category: 'Calves', target: 'Calves (gastrocnemius, stretch) primary' },

  // Core
  { name: 'Hanging leg raise', category: 'Core', target: 'Lower abs, hip flexors primary' },
  { name: 'Cable crunch', category: 'Core', target: 'Rectus abdominis primary' },
  { name: 'Plank', category: 'Core', target: 'Rectus/transverse abdominis primary' },
  { name: 'Ab wheel rollout', category: 'Core', target: 'Rectus abdominis, obliques primary' },
  { name: 'Russian twist', category: 'Core', target: 'Obliques primary' },
  { name: 'Weighted sit-up', category: 'Core', target: 'Rectus abdominis, hip flexors primary' },
  { name: 'Pallof press', category: 'Core', target: 'Obliques (anti-rotation) primary' },
  { name: 'Side plank', category: 'Core', target: 'Obliques primary' },

  // Full Body
  { name: 'Power clean', category: 'Full Body', target: 'Posterior chain, traps primary · full-body power' },
  { name: 'Clean and press', category: 'Full Body', target: 'Full body, shoulders primary' },
  { name: 'Kettlebell swing', category: 'Full Body', target: 'Glutes, hamstrings primary · core secondary' },
  { name: "Farmer's carry", category: 'Full Body', target: 'Grip, traps, core primary' },
  { name: 'Turkish get-up', category: 'Full Body', target: 'Full body stability, shoulders primary' },
  { name: 'Thruster', category: 'Full Body', target: 'Quads, shoulders primary · full-body conditioning' },

  // Mobility & Cardio (Active Rest)
  { name: 'Incline walk', category: 'Mobility & Cardio', target: 'Low-intensity cardio · recovery' },
  { name: 'Easy jog', category: 'Mobility & Cardio', target: 'Low-intensity cardio · recovery' },
  { name: 'Stationary bike (easy pace)', category: 'Mobility & Cardio', target: 'Low-intensity cardio · recovery' },
  { name: 'Light swim', category: 'Mobility & Cardio', target: 'Full-body low-impact cardio · recovery' },
  { name: 'Foam rolling full body', category: 'Mobility & Cardio', target: 'Myofascial release · recovery' },
  { name: 'Dynamic stretching flow', category: 'Mobility & Cardio', target: 'Full-body mobility' },
  { name: 'Hip mobility flow', category: 'Mobility & Cardio', target: 'Hip flexors, glutes mobility' },
  { name: 'Ankle mobility drill', category: 'Mobility & Cardio', target: 'Ankle/calf mobility' },
  { name: 'Cat-cow + thoracic rotations', category: 'Mobility & Cardio', target: 'Spine, thoracic mobility' },
  { name: 'Band pull-aparts', category: 'Mobility & Cardio', target: 'Rear delts, rotator cuff activation' },
  { name: 'Hamstring + hip flexor stretch', category: 'Mobility & Cardio', target: 'Hamstrings, hip flexors mobility' },
]

const BY_NAME = new Map(EXERCISE_CATALOG.map((e) => [e.name.toLowerCase(), e]))

export function findExerciseTarget(name) {
  if (!name) return null
  return BY_NAME.get(name.trim().toLowerCase())?.target ?? null
}
