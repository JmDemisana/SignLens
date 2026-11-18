import type { PoseTemplate, Vec3 } from './types'

// Joint angle presets matching STATIC_TEMPLATES conventions:
// [thumbMCP, thumbIP, indexMCP, indexPIP, middleMCP, middlePIP, ringMCP, ringPIP, pinkyMCP, pinkyPIP, wristSpread]
const S = 170 // Straight / extended
const H = 115 // Half bent / curved
const B = 55  // Bent / curled into palm

const HAND_OPEN_5 = [S, S, S, S, S, S, S, S, S, S, 72]
const HAND_FLAT_B = [90, 100, S, S, S, S, S, S, S, S, 65]
const HAND_FIST_S = [80, 85, B, B, B, B, B, B, B, B, 52]
const HAND_THUMBS_UP = [S, S, B, B, B, B, B, B, B, B, 58]
const HAND_INDEX_1 = [75, 80, S, S, B, B, B, B, B, B, 56]
const HAND_HINDI = [80, 85, H, H, H, H, B, B, B, B, 58]
const HAND_V_U = [70, 80, S, S, S, S, B, B, B, B, 64]
const HAND_W = [70, 80, S, S, S, S, S, S, B, B, 72]
const HAND_F = [100, 110, 100, 110, S, S, S, S, S, S, 62]
const HAND_G = [160, 165, S, S, B, B, B, B, B, B, 55]
const HAND_P = [120, 120, S, S, H, H, B, B, B, B, 60]
const HAND_PINKY_I = [B, B, B, B, B, B, B, B, S, S, 55]
const HAND_Y = [S, S, B, B, B, B, B, B, S, S, 70]
const HAND_CUP = [H, H, H, H, H, H, H, H, H, H, 62]

// Canonical trajectory shapes matched to FSL-105 videos
const PATH_UP: Vec3[] = [{ x: 0.5, y: 0.6, z: 0 }, { x: 0.5, y: 0.52, z: 0 }, { x: 0.5, y: 0.44, z: 0 }]
const PATH_DOWN: Vec3[] = [{ x: 0.5, y: 0.44, z: 0 }, { x: 0.5, y: 0.52, z: 0 }, { x: 0.5, y: 0.6, z: 0 }]
const PATH_OUT: Vec3[] = [{ x: 0.48, y: 0.48, z: 0 }, { x: 0.54, y: 0.46, z: 0 }, { x: 0.62, y: 0.48, z: 0 }]
const PATH_NOD: Vec3[] = [{ x: 0.5, y: 0.46, z: 0 }, { x: 0.5, y: 0.56, z: 0 }, { x: 0.5, y: 0.46, z: 0 }]
const PATH_CIRCLE: Vec3[] = [
  { x: 0.48, y: 0.52, z: 0 },
  { x: 0.54, y: 0.54, z: 0 },
  { x: 0.5, y: 0.58, z: 0 },
  { x: 0.48, y: 0.52, z: 0 },
]
const PATH_TAP_FOREHEAD: Vec3[] = [{ x: 0.48, y: 0.42, z: 0 }, { x: 0.48, y: 0.28, z: 0 }, { x: 0.48, y: 0.34, z: 0 }]
const PATH_TAP_CHIN: Vec3[] = [{ x: 0.5, y: 0.48, z: 0 }, { x: 0.5, y: 0.41, z: 0 }, { x: 0.5, y: 0.45, z: 0 }]
const PATH_SLICE: Vec3[] = [{ x: 0.46, y: 0.56, z: 0 }, { x: 0.52, y: 0.6, z: 0 }, { x: 0.46, y: 0.56, z: 0 }]
const PATH_ARC_CHEEK: Vec3[] = [{ x: 0.44, y: 0.36, z: 0 }, { x: 0.48, y: 0.41, z: 0 }, { x: 0.52, y: 0.46, z: 0 }]

interface FslSpec {
  id: string
  title: string
  category: string
  twoHanded: boolean
  zone: 'forehead' | 'chin' | 'chest'
  angles: number[]
  path: Vec3[]
  hint: string
  desc?: string
}

// All 95 lexical FSL-105 vocabulary signs + '10' (TEN), paired with static digits '1'-'9' = full 105 videos
const FSL_SPECS: FslSpec[] = [
  // Greetings (0-9)
  { id: 'MAGANDANG UMAGA', title: 'Magandang Umaga (Good Morning)', category: 'Greetings', twoHanded: false, zone: 'chest', angles: HAND_OPEN_5, path: PATH_OUT, hint: 'Start with a thumbs-up at chest height, then open your hand outward', desc: 'Starts with a thumbs-up at chest height and opens outward into a spread hand.' },
  { id: 'GOOD AFTERNOON', title: 'Good Afternoon', category: 'Greetings', twoHanded: false, zone: 'chin', angles: HAND_FLAT_B, path: PATH_OUT, hint: 'Touch near chin, then angle flat hand forward' },
  { id: 'GOOD EVENING', title: 'Good Evening', category: 'Greetings', twoHanded: true, zone: 'chest', angles: HAND_FLAT_B, path: PATH_DOWN, hint: 'Start with thumbs-up, then curve dominant hand down over the other' },
  { id: 'HELLO', title: 'Hello', category: 'Greetings', twoHanded: false, zone: 'forehead', angles: HAND_FLAT_B, path: PATH_OUT, hint: 'Touch near temple and salute outward', desc: 'Flat hand touches near the temple and salutes outward.' },
  { id: 'KAMUSTA', title: 'Kamusta (How Are You)', category: 'Greetings', twoHanded: true, zone: 'chest', angles: HAND_THUMBS_UP, path: PATH_UP, hint: 'Roll both hands at chest height and finish in thumbs-up', desc: 'Both hands meet at the chest, roll outward, and finish in a thumbs-up greeting.' },
  { id: 'IM FINE', title: "I'm Fine", category: 'Greetings', twoHanded: false, zone: 'chest', angles: HAND_OPEN_5, path: PATH_NOD, hint: 'Tap thumb of open spread hand against center of chest' },
  { id: 'NICE TO MEET YOU', title: 'Nice to Meet You', category: 'Greetings', twoHanded: true, zone: 'chest', angles: HAND_FLAT_B, path: PATH_OUT, hint: 'Brush palm across palm, then bring both index fingers together' },
  { id: 'SALAMAT', title: 'Salamat (Thank You)', category: 'Greetings', twoHanded: true, zone: 'chin', angles: HAND_FLAT_B, path: PATH_DOWN, hint: 'Touch both flat hands to chin and move forward and down', desc: 'Both flat hands touch near the chin and move forward and down together.' },
  { id: 'YOURE WELCOME', title: "You're Welcome", category: 'Greetings', twoHanded: false, zone: 'chin', angles: HAND_FLAT_B, path: PATH_DOWN, hint: 'Move flat hand from chin sweeping downward toward waist' },
  { id: 'SEE YOU TOMORROW', title: 'See You Tomorrow', category: 'Greetings', twoHanded: false, zone: 'chin', angles: HAND_THUMBS_UP, path: PATH_OUT, hint: 'Point near eye, then arc thumbs-up thumb forward from cheek' },

  // Survival & Responses (10-19)
  { id: 'NAIINTINDIHAN', title: 'Naiintindihan (Understand)', category: 'Responses', twoHanded: false, zone: 'forehead', angles: HAND_INDEX_1, path: PATH_UP, hint: 'Flick your index finger up beside your forehead', desc: 'Index finger flicks upright beside the temple.' },
  { id: 'DON’T UNDERSTAND', title: "Don't Understand", category: 'Responses', twoHanded: false, zone: 'forehead', angles: HAND_INDEX_1, path: PATH_UP, hint: 'Flick index finger near temple while shaking head no' },
  { id: 'KNOW', title: 'Know', category: 'Responses', twoHanded: false, zone: 'forehead', angles: HAND_FLAT_B, path: PATH_TAP_FOREHEAD, hint: 'Tap curved fingertips against your temple' },
  { id: 'DON’T KNOW', title: "Don't Know", category: 'Responses', twoHanded: false, zone: 'forehead', angles: HAND_FLAT_B, path: PATH_OUT, hint: 'Touch fingertips to temple, then flick hand outward' },
  { id: 'HINDI', title: 'Hindi (No)', category: 'Responses', twoHanded: false, zone: 'chest', angles: HAND_HINDI, path: PATH_OUT, hint: 'Snap index and middle fingers onto your thumb', desc: 'Index and middle fingers tap closed against the thumb.' },
  { id: 'OO', title: 'Oo (Yes)', category: 'Responses', twoHanded: false, zone: 'chest', angles: HAND_FIST_S, path: PATH_NOD, hint: 'Make a closed fist and nod your wrist up and down', desc: 'Closed fist nods downward at chest height.' },
  { id: 'MALI', title: 'Mali (Wrong)', category: 'Responses', twoHanded: false, zone: 'chin', angles: HAND_Y, path: PATH_TAP_CHIN, hint: 'Extend thumb and pinky and tap your chin', desc: 'Thumb and pinky extended; taps against the chin.' },
  { id: 'TAMA', title: 'Tama (Correct)', category: 'Responses', twoHanded: true, zone: 'chest', angles: HAND_INDEX_1, path: PATH_DOWN, hint: 'Extend both index fingers and tap top onto bottom', desc: 'Both index fingers extended; top index strikes down onto bottom index.' },
  { id: 'MABAGAL', title: 'Mabagal (Slow)', category: 'Responses', twoHanded: true, zone: 'chest', angles: HAND_FLAT_B, path: PATH_UP, hint: 'Slide one open palm slowly up the back of your other hand', desc: 'Open palm slides slowly up the back of the other hand.' },
  { id: 'FAST', title: 'Fast', category: 'Responses', twoHanded: false, zone: 'chest', angles: HAND_INDEX_1, path: PATH_OUT, hint: 'Quickly snap index or L-hand backward toward chest' },

  // Number 10 (29)
  { id: '10', title: 'Digit 10 (Ten)', category: 'Numbers', twoHanded: false, zone: 'chest', angles: HAND_THUMBS_UP, path: PATH_CIRCLE, hint: 'Hold a thumbs-up at chest height and shake wrist side to side' },

  // Calendar Months (30-41 — all 2-handed at chest in FSL-105)
  { id: 'JANUARY', title: 'January', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_INDEX_1, path: PATH_CIRCLE, hint: 'Use both hands at chest height to sign January' },
  { id: 'FEBRUARY', title: 'February', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_F, path: PATH_CIRCLE, hint: 'Sign F over your non-dominant hand at chest height' },
  { id: 'MARCH', title: 'March', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_FIST_S, path: PATH_CIRCLE, hint: 'Sign M beside non-dominant index finger at chest height' },
  { id: 'APRIL', title: 'April', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_INDEX_1, path: PATH_NOD, hint: 'Touch dominant fingers to non-dominant index finger' },
  { id: 'MAY', title: 'May', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_Y, path: PATH_NOD, hint: 'Touch dominant hand onto non-dominant upright index finger' },
  { id: 'JUNE', title: 'June', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_V_U, path: PATH_CIRCLE, hint: 'Trace dominant hand beside non-dominant finger at chest' },
  { id: 'JULY', title: 'July', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_INDEX_1, path: PATH_NOD, hint: 'Combine both hands at chest height for July' },
  { id: 'AUGUST', title: 'August', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_V_U, path: PATH_CIRCLE, hint: 'Hold both hands together at chest height for August' },
  { id: 'SEPTEMBER', title: 'September', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_FIST_S, path: PATH_SLICE, hint: 'Brush S-fist across non-dominant index at chest height' },
  { id: 'OCTOBER', title: 'October', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_CUP, path: PATH_CIRCLE, hint: 'Touch curved O-hand to non-dominant index finger' },
  { id: 'NOVEMBER', title: 'November', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_FIST_S, path: PATH_NOD, hint: 'Tap N-hand onto non-dominant index finger' },
  { id: 'DECEMBER', title: 'December', category: 'Months', twoHanded: true, zone: 'chest', angles: HAND_INDEX_1, path: PATH_CIRCLE, hint: 'Tap D-hand onto non-dominant index finger' },

  // Days & Time (42-51)
  { id: 'MONDAY', title: 'Monday', category: 'Days & Time', twoHanded: false, zone: 'chest', angles: HAND_FIST_S, path: PATH_CIRCLE, hint: 'Form an M-fist at shoulder height and trace a small circle' },
  { id: 'TUESDAY', title: 'Tuesday', category: 'Days & Time', twoHanded: false, zone: 'chest', angles: HAND_FIST_S, path: PATH_CIRCLE, hint: 'Form a T-fist at shoulder height and trace a small circle' },
  { id: 'WEDNESDAY', title: 'Wednesday', category: 'Days & Time', twoHanded: false, zone: 'chest', angles: HAND_W, path: PATH_CIRCLE, hint: 'Raise three fingers (W) and trace a small circle' },
  { id: 'THURSDAY', title: 'Thursday', category: 'Days & Time', twoHanded: false, zone: 'forehead', angles: HAND_V_U, path: PATH_CIRCLE, hint: 'Extend two fingers (H) beside temple and circle gently' },
  { id: 'FRIDAY', title: 'Friday', category: 'Days & Time', twoHanded: false, zone: 'chest', angles: HAND_F, path: PATH_CIRCLE, hint: 'Touch thumb and index (F) with three fingers up and circle' },
  { id: 'SATURDAY', title: 'Saturday', category: 'Days & Time', twoHanded: true, zone: 'chest', angles: HAND_FIST_S, path: PATH_CIRCLE, hint: 'Hold both S-fists at chest height and circle gently' },
  { id: 'SUNDAY', title: 'Sunday', category: 'Days & Time', twoHanded: true, zone: 'chest', angles: HAND_OPEN_5, path: PATH_OUT, hint: 'Raise both open palms facing forward and press gently forward' },
  { id: 'TODAY', title: 'Today / Now', category: 'Days & Time', twoHanded: true, zone: 'chest', angles: HAND_Y, path: PATH_DOWN, hint: 'Hold both Y-hands with palms up and lower slightly twice' },
  { id: 'TOMORROW', title: 'Tomorrow', category: 'Days & Time', twoHanded: false, zone: 'chin', angles: HAND_THUMBS_UP, path: PATH_OUT, hint: 'Place thumbs-up thumb against cheek and arc forward' },
  { id: 'YESTERDAY', title: 'Yesterday', category: 'Days & Time', twoHanded: false, zone: 'chin', angles: HAND_THUMBS_UP, path: PATH_ARC_CHEEK, hint: 'Touch thumb to cheek, then arc backward toward your ear' },

  // Family (52-61)
  { id: 'TATAY', title: 'Tatay (Father)', category: 'Family', twoHanded: false, zone: 'forehead', angles: HAND_OPEN_5, path: PATH_TAP_FOREHEAD, hint: 'Spread all fingers and tap your thumb against your forehead', desc: 'Thumb of open hand taps against the forehead.' },
  { id: 'NANAY', title: 'Nanay (Mother)', category: 'Family', twoHanded: false, zone: 'chin', angles: HAND_OPEN_5, path: PATH_TAP_CHIN, hint: 'Spread all fingers and tap your thumb against your chin', desc: 'Thumb of open hand taps against the chin.' },
  { id: 'SON', title: 'Son', category: 'Family', twoHanded: false, zone: 'forehead', angles: HAND_FLAT_B, path: PATH_DOWN, hint: 'Salute from forehead then lower forearm as if cradling' },
  { id: 'DAUGHTER', title: 'Daughter', category: 'Family', twoHanded: true, zone: 'chest', angles: HAND_FLAT_B, path: PATH_DOWN, hint: 'Touch jawline, then fold both forearms in a cradling motion' },
  { id: 'GRANDFATHER', title: 'Grandfather', category: 'Family', twoHanded: false, zone: 'forehead', angles: HAND_OPEN_5, path: PATH_OUT, hint: 'Touch thumb to forehead, then arc forward in two bounces' },
  { id: 'GRANDMOTHER', title: 'Grandmother', category: 'Family', twoHanded: false, zone: 'chin', angles: HAND_OPEN_5, path: PATH_OUT, hint: 'Touch thumb to chin, then arc forward in two bounces' },
  { id: 'UNCLE', title: 'Uncle', category: 'Family', twoHanded: false, zone: 'forehead', angles: HAND_V_U, path: PATH_CIRCLE, hint: 'Raise two fingers (U) beside forehead and twist gently' },
  { id: 'AUNTIE', title: 'Auntie', category: 'Family', twoHanded: false, zone: 'chin', angles: HAND_THUMBS_UP, path: PATH_CIRCLE, hint: 'Hold closed fist with thumb up (A) beside cheek and twist' },
  { id: 'COUSIN', title: 'Cousin', category: 'Family', twoHanded: false, zone: 'forehead', angles: HAND_CUP, path: PATH_CIRCLE, hint: 'Form a curved C-hand beside temple and shake gently' },
  { id: 'MAGULANG', title: 'Magulang (Parents)', category: 'Family', twoHanded: false, zone: 'forehead', angles: HAND_OPEN_5, path: PATH_DOWN, hint: 'Touch forehead with open hand then move down to chin', desc: 'Open hand touches the forehead then moves down to the chin.' },

  // People & Relationships (62-71)
  { id: 'BOY', title: 'Boy', category: 'People', twoHanded: false, zone: 'forehead', angles: HAND_CUP, path: PATH_TAP_FOREHEAD, hint: 'Pinch fingers together at the forehead like gripping a cap brim' },
  { id: 'GIRL', title: 'Girl', category: 'People', twoHanded: false, zone: 'chin', angles: HAND_THUMBS_UP, path: PATH_DOWN, hint: 'Brush side of thumbs-up thumb downward along your jawline' },
  { id: 'MAN', title: 'Man', category: 'People', twoHanded: false, zone: 'forehead', angles: HAND_FLAT_B, path: PATH_DOWN, hint: 'Touch forehead, then bring open palm onto chest' },
  { id: 'WOMAN', title: 'Woman', category: 'People', twoHanded: false, zone: 'chin', angles: HAND_OPEN_5, path: PATH_DOWN, hint: 'Touch chin with thumb of open hand, then bring onto chest' },
  { id: 'BINGI', title: 'Bingi (Deaf)', category: 'People', twoHanded: false, zone: 'chin', angles: HAND_INDEX_1, path: PATH_ARC_CHEEK, hint: 'Touch near your ear with index finger then arc to your mouth', desc: 'Index fingertip touches near the ear then arcs to the mouth.' },
  { id: 'HARD OF HEARING', title: 'Hard of Hearing', category: 'People', twoHanded: false, zone: 'chest', angles: HAND_V_U, path: PATH_OUT, hint: 'Extend two fingers (H) and tap twice forward at shoulder height' },
  { id: 'WEELCHAIR PERSON', title: 'Wheelchair User', category: 'People', twoHanded: true, zone: 'chest', angles: HAND_CUP, path: PATH_CIRCLE, hint: 'Curl both hands at your sides and roll forward like wheels' },
  { id: 'BLIND', title: 'Blind', category: 'People', twoHanded: false, zone: 'forehead', angles: HAND_HINDI, path: PATH_DOWN, hint: 'Bend index and middle fingers and pull gently down from eyes' },
  { id: 'DEAF BLIND', title: 'Deaf-Blind', category: 'People', twoHanded: false, zone: 'forehead', angles: HAND_HINDI, path: PATH_ARC_CHEEK, hint: 'Sign Deaf from ear to mouth, then pull curved V downward from eyes' },
  { id: 'MARRIED', title: 'Married', category: 'People', twoHanded: true, zone: 'chest', angles: HAND_CUP, path: PATH_NOD, hint: 'Clasp both hands comfortably together at chest height' },

  // Colors (72-84)
  { id: 'BLUE', title: 'Blue', category: 'Colors', twoHanded: false, zone: 'chest', angles: HAND_FLAT_B, path: PATH_CIRCLE, hint: 'Hold upright B-hand at shoulder height and twist side to side' },
  { id: 'GREEN', title: 'Green', category: 'Colors', twoHanded: false, zone: 'chest', angles: HAND_G, path: PATH_CIRCLE, hint: 'Point thumb and index sideways (G) and shake wrist gently' },
  { id: 'RED', title: 'Red', category: 'Colors', twoHanded: false, zone: 'chin', angles: HAND_INDEX_1, path: PATH_DOWN, hint: 'Touch index fingertip to lower lip and stroke downward twice' },
  { id: 'BROWN', title: 'Brown', category: 'Colors', twoHanded: true, zone: 'chest', angles: HAND_OPEN_5, path: PATH_OUT, hint: 'Extend both spread hands at chest and move gently forward' },
  { id: 'BLACK', title: 'Black', category: 'Colors', twoHanded: false, zone: 'forehead', angles: HAND_INDEX_1, path: PATH_OUT, hint: 'Draw your extended index finger smoothly across your eyebrow' },
  { id: 'WHITE', title: 'White', category: 'Colors', twoHanded: false, zone: 'chest', angles: HAND_OPEN_5, path: PATH_OUT, hint: 'Place spread hand on chest and pull outward closing fingers together' },
  { id: 'YELLOW', title: 'Yellow', category: 'Colors', twoHanded: false, zone: 'chest', angles: HAND_Y, path: PATH_CIRCLE, hint: 'Extend thumb and pinky (Y) at shoulder height and twist twice' },
  { id: 'ORANGE', title: 'Orange', category: 'Colors', twoHanded: false, zone: 'chin', angles: HAND_CUP, path: PATH_NOD, hint: 'Place curved hand beside chin and squeeze into a fist twice' },
  { id: 'GRAY', title: 'Gray', category: 'Colors', twoHanded: true, zone: 'chest', angles: HAND_OPEN_5, path: PATH_SLICE, hint: 'Pass both spread hands in and out between your fingers' },
  { id: 'PINK', title: 'Pink', category: 'Colors', twoHanded: false, zone: 'chin', angles: HAND_P, path: PATH_DOWN, hint: 'Stroke middle fingertip of P-hand downward off your lower lip' },
  { id: 'VIOLET', title: 'Violet', category: 'Colors', twoHanded: true, zone: 'chest', angles: HAND_V_U, path: PATH_CIRCLE, hint: 'Form V-hand at chest beside your non-dominant hand and twist' },
  { id: 'LIGHT', title: 'Light (Color Shade)', category: 'Colors', twoHanded: true, zone: 'chin', angles: HAND_OPEN_5, path: PATH_UP, hint: 'Lift both hands up near chest/chin opening fingers upward' },
  { id: 'DARK', title: 'Dark', category: 'Colors', twoHanded: true, zone: 'chest', angles: HAND_FLAT_B, path: PATH_SLICE, hint: 'Cross both flat palms smoothly in front of chest and face' },

  // Food (85-94)
  { id: 'TINAPAY', title: 'Tinapay (Bread)', category: 'Food', twoHanded: true, zone: 'chest', angles: HAND_FLAT_B, path: PATH_SLICE, hint: 'Slice flat hand across the back of your other hand', desc: 'One hand slices across the back of the other hand.' },
  { id: 'EGG', title: 'Egg', category: 'Food', twoHanded: true, zone: 'chest', angles: HAND_CUP, path: PATH_DOWN, hint: 'Tap both hands together at chest, then pull down and apart' },
  { id: 'FISH', title: 'Fish', category: 'Food', twoHanded: false, zone: 'chest', angles: HAND_FLAT_B, path: PATH_OUT, hint: 'Hold flat vertical hand at chest and wiggle forward like a fish' },
  { id: 'MEAT', title: 'Meat', category: 'Food', twoHanded: true, zone: 'chest', angles: HAND_CUP, path: PATH_NOD, hint: 'Pinch the web of your flat non-dominant hand and shake slightly' },
  { id: 'CHICKEN', title: 'Chicken', category: 'Food', twoHanded: false, zone: 'forehead', angles: HAND_CUP, path: PATH_NOD, hint: 'Open and close thumb and index beak beside face, then scratch' },
  { id: 'SPAGHETTI', title: 'Spaghetti', category: 'Food', twoHanded: true, zone: 'chest', angles: HAND_PINKY_I, path: PATH_CIRCLE, hint: 'Extend both pinky fingers and spiral outward like noodles' },
  { id: 'KANIN', title: 'Kanin (Rice)', category: 'Food', twoHanded: true, zone: 'chin', angles: HAND_CUP, path: PATH_UP, hint: 'Cup one hand and scoop upward toward your mouth', desc: 'One hand cups like a bowl while the other scoops upward to the mouth.' },
  { id: 'LONGANISA', title: 'Longanisa', category: 'Food', twoHanded: true, zone: 'chest', angles: HAND_CUP, path: PATH_OUT, hint: 'Pinch thumb and index on both hands and pull outward like links' },
  { id: 'SHRIMP', title: 'Shrimp', category: 'Food', twoHanded: false, zone: 'chest', angles: HAND_CUP, path: PATH_OUT, hint: 'Curl index finger and bounce forward twice like a swimming shrimp' },
  { id: 'CRAB', title: 'Crab', category: 'Food', twoHanded: true, zone: 'chest', angles: HAND_CUP, path: PATH_NOD, hint: 'Pinch thumb against index and middle fingers on both hands like claws' },

  // Drinks (95-104)
  { id: 'HOT', title: 'Hot', category: 'Drinks', twoHanded: false, zone: 'chin', angles: HAND_CUP, path: PATH_DOWN, hint: 'Hold curved hand in front of mouth and turn sharply downward' },
  { id: 'COLD', title: 'Cold', category: 'Drinks', twoHanded: true, zone: 'chest', angles: HAND_FIST_S, path: PATH_NOD, hint: 'Pull both closed fists toward body and shiver at chest height' },
  { id: 'JUICE', title: 'Juice', category: 'Drinks', twoHanded: true, zone: 'chest', angles: HAND_PINKY_I, path: PATH_DOWN, hint: 'Cup one hand as a glass and trace a J with your pinky inside' },
  { id: 'GATAS', title: 'Gatas (Milk)', category: 'Drinks', twoHanded: false, zone: 'chest', angles: HAND_FIST_S, path: PATH_NOD, hint: 'Squeeze your hand open and closed into a fist at chest height', desc: 'Single hand squeezes open and closed into a fist at chest height.' },
  { id: 'KAPE', title: 'Kape (Coffee)', category: 'Drinks', twoHanded: true, zone: 'chest', angles: HAND_FIST_S, path: PATH_CIRCLE, hint: 'Stack two fists and circle the top fist', desc: 'Two fists stacked together with the top fist grinding in a circle.' },
  { id: 'TEA', title: 'Tea', category: 'Drinks', twoHanded: false, zone: 'forehead', angles: HAND_F, path: PATH_DOWN, hint: 'Pinch thumb and index (F) and dip down twice like a teabag' },
  { id: 'BEER', title: 'Beer', category: 'Drinks', twoHanded: false, zone: 'chin', angles: HAND_FLAT_B, path: PATH_DOWN, hint: 'Stroke side of upright flat hand downward along your cheek' },
  { id: 'WINE', title: 'Wine', category: 'Drinks', twoHanded: false, zone: 'chin', angles: HAND_W, path: PATH_CIRCLE, hint: 'Hold three fingers (W) beside your cheek and circle smoothly' },
  { id: 'SUGAR', title: 'Sugar', category: 'Drinks', twoHanded: false, zone: 'chin', angles: HAND_V_U, path: PATH_DOWN, hint: 'Brush two extended fingers downward from your chin' },
  { id: 'NO SUGAR', title: 'No Sugar', category: 'Drinks', twoHanded: false, zone: 'chin', angles: HAND_HINDI, path: PATH_DOWN, hint: 'Pinch fingers for No, then brush two fingers down chin for Sugar' },
]

export const FSL_TEMPLATES: PoseTemplate[] = FSL_SPECS.map((item) => ({
  id: item.id,
  kind: 'dynamic',
  lang: 'FSL',
  twoHanded: item.twoHanded,
  zone: item.zone,
  angles: item.angles,
  path: item.path,
  hint: item.hint,
}))

export const FSL_DEFINITIONS: Record<string, { title: string; sub: string; desc: string }> = Object.fromEntries(
  FSL_SPECS.map((item) => [
    item.id,
    {
      title: item.title,
      sub: `${item.category} · ${item.twoHanded ? '2 Hands' : '1 Hand'}`,
      desc: item.desc ?? item.hint,
    },
  ]),
)
