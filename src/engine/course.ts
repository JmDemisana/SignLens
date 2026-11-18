import type { LessonItem, SignLang } from './types'

export interface CourseLesson {
  id: string
  title: string
  objective: string
  items: LessonItem[]
  levels: [LessonItem[], LessonItem[], LessonItem[]]
}

export interface CourseChapter {
  id: string
  title: string
  description: string
  vocabulary: string[]
  source: { title: string; url: string }
  lessons: CourseLesson[]
}

const fslSource = { title: 'FSL-105 Dataset (Tupal & Cabatuan, 2023)', url: 'https://data.mendeley.com/datasets/48y2y99mb9/2' }

const LABELS: Record<string, string> = {
  'MAGANDANG UMAGA': 'Magandang Umaga',
  KAMUSTA: 'Kamusta',
  SALAMAT: 'Salamat',
  OO: 'Oo',
  HINDI: 'Hindi',
  TAMA: 'Tama',
  MALI: 'Mali',
  NAIINTINDIHAN: 'Naiintindihan',
  MABAGAL: 'Mabagal',
  TATAY: 'Tatay',
  NANAY: 'Nanay',
  MAGULANG: 'Magulang',
  BINGI: 'Bingi',
  TINAPAY: 'Tinapay',
  KANIN: 'Kanin',
  GATAS: 'Gatas',
  KAPE: 'Kape',
  'IM FINE': "I'm Fine",
  'YOURE WELCOME': "You're Welcome",
  'DON’T UNDERSTAND': "Don't Understand",
  'DON’T KNOW': "Don't Know",
  'WEELCHAIR PERSON': 'Wheelchair User',
}

function nice(id: string): string {
  if (LABELS[id]) return LABELS[id]
  return id.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

let seq = 0
const w = (id: string, label = nice(id)): LessonItem => ({ id, label })
const p = (signs: string[], label?: string): LessonItem => ({
  id: `P_${++seq}_${signs[0]}`,
  label: label ?? signs.map(nice).join(', '),
  signs,
})

const node = (
  id: string,
  title: string,
  star1Words: LessonItem[],
  star2Phrases: LessonItem[],
  star3Sentences: LessonItem[],
): CourseLesson => ({
  id,
  title,
  objective: '3-star progression',
  items: star1Words,
  levels: [star1Words, star2Phrases, star3Sentences],
})

const FSL_COURSE: CourseChapter[] = [
  // =========================================================================
  // UNIT 1: GREETINGS (4 Nodes x 3 Stars = 12 Star Stages)
  // =========================================================================
  {
    id: 'unit-1-greetings',
    title: 'Pagbati · Greetings',
    description: '',
    vocabulary: ['MAGANDANG UMAGA', 'GOOD AFTERNOON', 'GOOD EVENING', 'HELLO', 'KAMUSTA', 'IM FINE', 'NICE TO MEET YOU', 'SALAMAT', 'YOURE WELCOME', 'SEE YOU TOMORROW'],
    source: fslSource,
    lessons: [
      node(
        'u1-n1',
        'Time of Day',
        [w('MAGANDANG UMAGA'), w('GOOD AFTERNOON'), w('GOOD EVENING'), w('HELLO'), w('MAGANDANG UMAGA')],
        [p(['MAGANDANG UMAGA', 'HELLO']), p(['GOOD AFTERNOON', 'HELLO']), p(['GOOD EVENING', 'HELLO']), p(['MAGANDANG UMAGA', 'SALAMAT'])],
        [p(['MAGANDANG UMAGA', 'KAMUSTA', 'IM FINE']), p(['GOOD AFTERNOON', 'KAMUSTA', 'SALAMAT']), p(['GOOD EVENING', 'HELLO', 'SEE YOU TOMORROW'])],
      ),
      node(
        'u1-n2',
        'Kamusta & Replies',
        [w('KAMUSTA'), w('IM FINE'), w('HELLO'), w('KAMUSTA'), w('IM FINE')],
        [p(['HELLO', 'KAMUSTA']), p(['KAMUSTA', 'IM FINE']), p(['IM FINE', 'SALAMAT']), p(['MAGANDANG UMAGA', 'KAMUSTA'])],
        [p(['HELLO', 'KAMUSTA', 'IM FINE']), p(['KAMUSTA', 'IM FINE', 'SALAMAT']), p(['MAGANDANG UMAGA', 'KAMUSTA', 'IM FINE', 'SALAMAT'])],
      ),
      node(
        'u1-n3',
        'Courtesy & Partings',
        [w('NICE TO MEET YOU'), w('SALAMAT'), w('YOURE WELCOME'), w('SEE YOU TOMORROW'), w('SALAMAT')],
        [p(['NICE TO MEET YOU', 'SALAMAT']), p(['SALAMAT', 'YOURE WELCOME']), p(['GOOD EVENING', 'SEE YOU TOMORROW']), p(['IM FINE', 'SEE YOU TOMORROW'])],
        [p(['HELLO', 'NICE TO MEET YOU', 'SALAMAT']), p(['SALAMAT', 'YOURE WELCOME', 'SEE YOU TOMORROW']), p(['MAGANDANG UMAGA', 'NICE TO MEET YOU', 'SALAMAT'])],
      ),
      node(
        'u1-n4',
        'Unit 1 Checkpoint',
        [w('MAGANDANG UMAGA'), w('KAMUSTA'), w('NICE TO MEET YOU'), w('SALAMAT'), w('SEE YOU TOMORROW')],
        [p(['GOOD AFTERNOON', 'KAMUSTA']), p(['NICE TO MEET YOU', 'YOURE WELCOME']), p(['GOOD EVENING', 'SALAMAT']), p(['IM FINE', 'SEE YOU TOMORROW'])],
        [p(['HELLO', 'KAMUSTA', 'IM FINE', 'SALAMAT']), p(['HELLO', 'NICE TO MEET YOU', 'SALAMAT', 'YOURE WELCOME']), p(['GOOD EVENING', 'KAMUSTA', 'IM FINE', 'SEE YOU TOMORROW'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 2: RESPONSES & SURVIVAL
  // =========================================================================
  {
    id: 'unit-2-responses',
    title: 'Pagsagot · Responses',
    description: '',
    vocabulary: ['OO', 'HINDI', 'TAMA', 'MALI', 'NAIINTINDIHAN', 'DON’T UNDERSTAND', 'KNOW', 'DON’T KNOW', 'MABAGAL', 'FAST'],
    source: fslSource,
    lessons: [
      node(
        'u2-n1',
        'Oo, Hindi, Tama & Mali',
        [w('OO'), w('HINDI'), w('TAMA'), w('MALI'), w('OO'), w('HINDI')],
        [p(['OO', 'TAMA']), p(['HINDI', 'MALI']), p(['OO', 'IM FINE']), p(['HINDI', 'TAMA'])],
        [p(['OO', 'TAMA', 'SALAMAT']), p(['HINDI', 'MALI', 'OO', 'TAMA']), p(['KAMUSTA', 'OO', 'IM FINE'])],
      ),
      node(
        'u2-n2',
        'Understand & Know',
        [w('NAIINTINDIHAN'), w('DON’T UNDERSTAND'), w('KNOW'), w('DON’T KNOW'), w('NAIINTINDIHAN')],
        [p(['OO', 'NAIINTINDIHAN']), p(['HINDI', 'DON’T UNDERSTAND']), p(['OO', 'KNOW']), p(['HINDI', 'DON’T KNOW'])],
        [p(['OO', 'NAIINTINDIHAN', 'TAMA']), p(['HINDI', 'DON’T KNOW', 'SALAMAT']), p(['HELLO', 'OO', 'NAIINTINDIHAN'])],
      ),
      node(
        'u2-n3',
        'Pacing: Mabagal & Fast',
        [w('MABAGAL'), w('FAST'), w('DON’T UNDERSTAND'), w('NAIINTINDIHAN'), w('MABAGAL')],
        [p(['DON’T UNDERSTAND', 'MABAGAL']), p(['MABAGAL', 'SALAMAT']), p(['FAST', 'DON’T UNDERSTAND']), p(['MABAGAL', 'NAIINTINDIHAN'])],
        [p(['HINDI', 'DON’T UNDERSTAND', 'MABAGAL']), p(['FAST', 'MABAGAL', 'SALAMAT']), p(['HELLO', 'DON’T UNDERSTAND', 'MABAGAL', 'SALAMAT'])],
      ),
      node(
        'u2-n4',
        'Unit 2 Checkpoint',
        [w('OO'), w('HINDI'), w('TAMA'), w('NAIINTINDIHAN'), w('MABAGAL')],
        [p(['OO', 'KNOW']), p(['MALI', 'DON’T KNOW']), p(['FAST', 'MABAGAL']), p(['NAIINTINDIHAN', 'SALAMAT'])],
        [p(['OO', 'TAMA', 'NAIINTINDIHAN', 'SALAMAT']), p(['HINDI', 'MABAGAL', 'NAIINTINDIHAN', 'SALAMAT']), p(['NICE TO MEET YOU', 'MABAGAL', 'SALAMAT'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 3: NUMBERS 1 TO 10
  // =========================================================================
  {
    id: 'unit-3-numbers',
    title: 'Bilang · Numbers 1 to 10',
    description: '',
    vocabulary: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    source: fslSource,
    lessons: [
      node(
        'u3-n1',
        'Numbers 1 to 5',
        [w('1'), w('2'), w('3'), w('4'), w('5')],
        [p(['1', '2']), p(['3', '4']), p(['4', '5']), p(['2', 'TAMA'])],
        [p(['1', '2', '3']), p(['3', '4', '5']), p(['HELLO', '1', '2', '3'])],
      ),
      node(
        'u3-n2',
        'Numbers 6 to 10',
        [w('6'), w('7'), w('8'), w('9'), w('10')],
        [p(['6', '7']), p(['8', '9']), p(['9', '10']), p(['7', 'TAMA'])],
        [p(['6', '7', '8']), p(['8', '9', '10']), p(['OO', '10', 'TAMA'])],
      ),
      node(
        'u3-n3',
        'Counting Contrasts',
        [w('6'), w('9'), w('7'), w('8'), w('10')],
        [p(['5', '10']), p(['1', '10']), p(['3', '6']), p(['4', '8'])],
        [p(['2', '4', '6', '8']), p(['1', '3', '5', '7']), p(['9', 'MALI', '6', 'TAMA'])],
      ),
      node(
        'u3-n4',
        'Unit 3 Checkpoint',
        [w('2'), w('5'), w('7'), w('9'), w('10')],
        [p(['MABAGAL', '3']), p(['OO', '8']), p(['HINDI', '4']), p(['10', 'SALAMAT'])],
        [p(['1', '2', '3', '4']), p(['7', '8', '9', '10']), p(['MABAGAL', '6', '7', '8'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 4: DAYS & TIME
  // =========================================================================
  {
    id: 'unit-4-days',
    title: 'Araw · Days & Time',
    description: '',
    vocabulary: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'TODAY', 'TOMORROW', 'YESTERDAY'],
    source: fslSource,
    lessons: [
      node(
        'u4-n1',
        'Monday to Thursday',
        [w('MONDAY'), w('TUESDAY'), w('WEDNESDAY'), w('THURSDAY'), w('MONDAY')],
        [p(['MONDAY', 'TUESDAY']), p(['WEDNESDAY', 'THURSDAY']), p(['TODAY', 'MONDAY']), p(['TOMORROW', 'TUESDAY'])],
        [p(['MONDAY', 'TUESDAY', 'WEDNESDAY']), p(['TODAY', 'WEDNESDAY', 'TAMA']), p(['MAGANDANG UMAGA', 'TODAY', 'MONDAY'])],
      ),
      node(
        'u4-n2',
        'Friday to Sunday',
        [w('FRIDAY'), w('SATURDAY'), w('SUNDAY'), w('FRIDAY'), w('SUNDAY')],
        [p(['FRIDAY', 'SATURDAY']), p(['SATURDAY', 'SUNDAY']), p(['SEE YOU TOMORROW', 'FRIDAY']), p(['GOOD EVENING', 'SATURDAY'])],
        [p(['FRIDAY', 'SATURDAY', 'SUNDAY']), p(['TODAY', 'FRIDAY', 'SALAMAT']), p(['TOMORROW', 'SUNDAY', 'SEE YOU TOMORROW'])],
      ),
      node(
        'u4-n3',
        'Today, Tomorrow & Yesterday',
        [w('TODAY'), w('TOMORROW'), w('YESTERDAY'), w('TODAY'), w('TOMORROW')],
        [p(['TODAY', 'TOMORROW']), p(['YESTERDAY', 'TODAY']), p(['YESTERDAY', 'SUNDAY']), p(['TOMORROW', 'WEDNESDAY'])],
        [p(['YESTERDAY', 'TODAY', 'TOMORROW']), p(['OO', 'TOMORROW', 'FRIDAY']), p(['HINDI', 'YESTERDAY', 'TODAY', 'THURSDAY'])],
      ),
      node(
        'u4-n4',
        'Unit 4 Checkpoint',
        [w('TUESDAY'), w('THURSDAY'), w('SATURDAY'), w('TODAY'), w('YESTERDAY')],
        [p(['TODAY', 'THURSDAY']), p(['2', 'SUNDAY']), p(['YESTERDAY', 'MONDAY']), p(['TOMORROW', 'FRIDAY'])],
        [p(['HELLO', 'SEE YOU TOMORROW', 'FRIDAY', 'SALAMAT']), p(['TODAY', 'MONDAY', 'OO', 'NAIINTINDIHAN']), p(['MAGANDANG UMAGA', 'TODAY', 'SUNDAY', 'IM FINE'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 5: MONTHS & DATES
  // =========================================================================
  {
    id: 'unit-5-months',
    title: 'Buwan · Months & Dates',
    description: '',
    vocabulary: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
    source: fslSource,
    lessons: [
      node(
        'u5-n1',
        'January to April',
        [w('JANUARY'), w('FEBRUARY'), w('MARCH'), w('APRIL'), w('JANUARY')],
        [p(['JANUARY', '1']), p(['FEBRUARY', '2']), p(['MARCH', '3']), p(['APRIL', '4'])],
        [p(['TODAY', 'JANUARY', '1']), p(['MONDAY', 'MARCH', '3']), p(['HINDI', 'MARCH', 'APRIL', 'TAMA'])],
      ),
      node(
        'u5-n2',
        'May to August',
        [w('MAY'), w('JUNE'), w('JULY'), w('AUGUST'), w('MAY')],
        [p(['MAY', '5']), p(['JUNE', '6']), p(['JULY', '7']), p(['AUGUST', '8'])],
        [p(['FRIDAY', 'MAY', '7']), p(['SUNDAY', 'AUGUST', '9']), p(['MAGANDANG UMAGA', 'TODAY', 'JUNE', '5'])],
      ),
      node(
        'u5-n3',
        'September to December',
        [w('SEPTEMBER'), w('OCTOBER'), w('NOVEMBER'), w('DECEMBER'), w('NOVEMBER')],
        [p(['SEPTEMBER', '9']), p(['OCTOBER', '10']), p(['TODAY', 'NOVEMBER']), p(['TOMORROW', 'DECEMBER'])],
        [p(['TODAY', 'NOVEMBER', '4']), p(['OO', 'OCTOBER', '10', 'TAMA']), p(['YESTERDAY', 'SUNDAY', 'DECEMBER', '7'])],
      ),
      node(
        'u5-n4',
        'Unit 5 Checkpoint',
        [w('FEBRUARY'), w('JUNE'), w('SEPTEMBER'), w('NOVEMBER'), w('DECEMBER')],
        [p(['MABAGAL', 'JANUARY']), p(['OO', 'MAY']), p(['KNOW', 'OCTOBER']), p(['SUNDAY', 'AUGUST'])],
        [p(['TODAY', 'MONDAY', 'JANUARY', '1']), p(['TOMORROW', 'TUESDAY', 'FEBRUARY', '2']), p(['SEE YOU TOMORROW', 'FRIDAY', 'AUGUST', '8'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 6: FAMILY
  // =========================================================================
  {
    id: 'unit-6-family',
    title: 'Pamilya · Family',
    description: '',
    vocabulary: ['NANAY', 'TATAY', 'MAGULANG', 'SON', 'DAUGHTER', 'GRANDFATHER', 'GRANDMOTHER', 'UNCLE', 'AUNTIE', 'COUSIN'],
    source: fslSource,
    lessons: [
      node(
        'u6-n1',
        'Nanay, Tatay & Magulang',
        [w('NANAY'), w('TATAY'), w('MAGULANG'), w('NANAY'), w('TATAY')],
        [p(['NANAY', 'TATAY']), p(['MAGANDANG UMAGA', 'NANAY']), p(['KAMUSTA', 'TATAY']), p(['SALAMAT', 'MAGULANG'])],
        [p(['MAGANDANG UMAGA', 'NANAY', 'KAMUSTA']), p(['HELLO', 'TATAY', 'SALAMAT']), p(['HELLO', 'NANAY', 'KAMUSTA', 'IM FINE'])],
      ),
      node(
        'u6-n2',
        'Children & Grandparents',
        [w('SON'), w('DAUGHTER'), w('GRANDFATHER'), w('GRANDMOTHER'), w('SON')],
        [p(['SON', 'DAUGHTER']), p(['GRANDFATHER', 'GRANDMOTHER']), p(['2', 'SON']), p(['1', 'DAUGHTER'])],
        [p(['SEE YOU TOMORROW', 'SON', 'DAUGHTER']), p(['GRANDFATHER', 'IM FINE', 'SALAMAT']), p(['GOOD EVENING', 'GRANDMOTHER', 'KAMUSTA', 'IM FINE'])],
      ),
      node(
        'u6-n3',
        'Extended Family',
        [w('UNCLE'), w('AUNTIE'), w('COUSIN'), w('UNCLE'), w('AUNTIE')],
        [p(['UNCLE', 'AUNTIE']), p(['HELLO', 'COUSIN']), p(['SALAMAT', 'AUNTIE']), p(['NICE TO MEET YOU', 'COUSIN'])],
        [p(['TOMORROW', 'UNCLE', 'AUNTIE']), p(['COUSIN', 'NICE TO MEET YOU', 'SALAMAT']), p(['UNCLE', 'AUNTIE', 'NICE TO MEET YOU', 'SALAMAT'])],
      ),
      node(
        'u6-n4',
        'Unit 6 Checkpoint',
        [w('MAGULANG'), w('DAUGHTER'), w('GRANDFATHER'), w('UNCLE'), w('COUSIN')],
        [p(['SUNDAY', 'MAGULANG']), p(['GOOD AFTERNOON', 'GRANDFATHER']), p(['KAMUSTA', 'COUSIN']), p(['SALAMAT', 'NANAY'])],
        [p(['MAGANDANG UMAGA', 'TATAY', 'SALAMAT', 'SEE YOU TOMORROW']), p(['YESTERDAY', 'SUNDAY', 'GRANDFATHER', 'GRANDMOTHER']), p(['HELLO', 'MAGULANG', 'KAMUSTA', 'SALAMAT'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 7: PEOPLE & DEAF COMMUNITY
  // =========================================================================
  {
    id: 'unit-7-people',
    title: 'Tao · People & Community',
    description: '',
    vocabulary: ['BOY', 'GIRL', 'MAN', 'WOMAN', 'BINGI', 'HARD OF HEARING', 'WEELCHAIR PERSON', 'BLIND', 'DEAF BLIND', 'MARRIED'],
    source: fslSource,
    lessons: [
      node(
        'u7-n1',
        'Boy, Girl, Man & Woman',
        [w('BOY'), w('GIRL'), w('MAN'), w('WOMAN'), w('BOY')],
        [p(['BOY', 'GIRL']), p(['MAN', 'WOMAN']), p(['BOY', 'SON']), p(['GIRL', 'DAUGHTER'])],
        [p(['MAN', 'TATAY', 'SALAMAT']), p(['WOMAN', 'NANAY', 'KAMUSTA']), p(['BOY', '1', 'GIRL', '2'])],
      ),
      node(
        'u7-n2',
        'Deaf & Hard of Hearing',
        [w('BINGI'), w('HARD OF HEARING'), w('MARRIED'), w('BINGI'), w('HARD OF HEARING')],
        [p(['HELLO', 'BINGI']), p(['BINGI', 'MABAGAL']), p(['HARD OF HEARING', 'MABAGAL']), p(['MAN', 'WOMAN', 'MARRIED'])],
        [p(['HELLO', 'BINGI', 'NAIINTINDIHAN']), p(['WOMAN', 'HARD OF HEARING', 'MABAGAL']), p(['HELLO', 'NICE TO MEET YOU', 'BINGI', 'SALAMAT'])],
      ),
      node(
        'u7-n3',
        'Accessibility & Identity',
        [w('WEELCHAIR PERSON'), w('BLIND'), w('DEAF BLIND'), w('WEELCHAIR PERSON'), w('BLIND')],
        [p(['MAN', 'WEELCHAIR PERSON']), p(['WOMAN', 'BLIND']), p(['BINGI', 'DEAF BLIND']), p(['BLIND', 'MABAGAL'])],
        [p(['GRANDFATHER', 'HARD OF HEARING', 'MABAGAL']), p(['GRANDMOTHER', 'BLIND', 'MABAGAL']), p(['UNCLE', 'WEELCHAIR PERSON', 'IM FINE'])],
      ),
      node(
        'u7-n4',
        'Unit 7 Checkpoint',
        [w('BINGI'), w('HARD OF HEARING'), w('WEELCHAIR PERSON'), w('DEAF BLIND'), w('MARRIED')],
        [p(['UNCLE', 'MARRIED']), p(['AUNTIE', 'MARRIED']), p(['COUSIN', 'BINGI']), p(['OO', 'NAIINTINDIHAN'])],
        [p(['WOMAN', 'HARD OF HEARING', 'MABAGAL', 'SALAMAT']), p(['MAGULANG', 'OO', 'MARRIED', 'IM FINE']), p(['HELLO', 'NICE TO MEET YOU', 'BINGI', 'NAIINTINDIHAN'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 8: COLORS & DESCRIPTIONS
  // =========================================================================
  {
    id: 'unit-8-colors',
    title: 'Kulay · Colors',
    description: '',
    vocabulary: ['BLUE', 'GREEN', 'RED', 'YELLOW', 'ORANGE', 'PINK', 'VIOLET', 'BROWN', 'BLACK', 'WHITE', 'GRAY', 'LIGHT', 'DARK'],
    source: fslSource,
    lessons: [
      node(
        'u8-n1',
        'Blue, Green, Red & Yellow',
        [w('BLUE'), w('GREEN'), w('RED'), w('YELLOW'), w('BLUE')],
        [p(['BLUE', 'GREEN']), p(['RED', 'YELLOW']), p(['2', 'BLUE']), p(['3', 'GREEN'])],
        [p(['2', 'BLUE', 'TAMA']), p(['RED', 'MALI', 'BLUE']), p(['BOY', 'BLUE', 'GIRL', 'YELLOW'])],
      ),
      node(
        'u8-n2',
        'Orange, Pink, Violet & Brown',
        [w('ORANGE'), w('PINK'), w('VIOLET'), w('BROWN'), w('PINK')],
        [p(['ORANGE', 'PINK']), p(['VIOLET', 'BROWN']), p(['GIRL', 'PINK']), p(['TATAY', 'BROWN'])],
        [p(['NANAY', 'VIOLET', 'TATAY', 'BROWN']), p(['GIRL', 'PINK', 'BOY', 'ORANGE']), p(['SON', 'ORANGE', 'DAUGHTER', 'PINK'])],
      ),
      node(
        'u8-n3',
        'Black, White, Gray & Shades',
        [w('BLACK'), w('WHITE'), w('GRAY'), w('LIGHT'), w('DARK')],
        [p(['LIGHT', 'BLUE']), p(['DARK', 'BLUE']), p(['LIGHT', 'GREEN']), p(['DARK', 'RED'])],
        [p(['BLACK', 'WHITE', 'GRAY']), p(['OO', 'LIGHT', 'YELLOW', 'TAMA']), p(['HINDI', 'DARK', 'BLUE', 'WHITE'])],
      ),
      node(
        'u8-n4',
        'Unit 8 Checkpoint',
        [w('GREEN'), w('VIOLET'), w('BROWN'), w('LIGHT'), w('DARK')],
        [p(['LIGHT', 'YELLOW']), p(['DARK', 'BROWN']), p(['LIGHT', 'VIOLET']), p(['DARK', 'GRAY'])],
        [p(['1', 'LIGHT', 'GREEN', 'TAMA']), p(['4', 'DARK', 'RED', 'SALAMAT']), p(['BOY', 'BLUE', 'GIRL', 'PINK'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 9: FOOD & MEALS
  // =========================================================================
  {
    id: 'unit-9-food',
    title: 'Pagkain · Food',
    description: '',
    vocabulary: ['KANIN', 'TINAPAY', 'EGG', 'MEAT', 'CHICKEN', 'LONGANISA', 'SPAGHETTI', 'FISH', 'SHRIMP', 'CRAB'],
    source: fslSource,
    lessons: [
      node(
        'u9-n1',
        'Breakfast: Rice, Bread & Egg',
        [w('KANIN'), w('TINAPAY'), w('EGG'), w('KANIN'), w('TINAPAY')],
        [p(['KANIN', 'EGG']), p(['TINAPAY', 'EGG']), p(['2', 'TINAPAY']), p(['1', 'KANIN'])],
        [p(['MAGANDANG UMAGA', 'KANIN', 'EGG']), p(['TINAPAY', 'EGG', 'SALAMAT']), p(['MAGANDANG UMAGA', '2', 'TINAPAY', 'EGG'])],
      ),
      node(
        'u9-n2',
        'Mains: Meat, Chicken & Pasta',
        [w('MEAT'), w('CHICKEN'), w('LONGANISA'), w('SPAGHETTI'), w('CHICKEN')],
        [p(['KANIN', 'LONGANISA']), p(['KANIN', 'CHICKEN']), p(['1', 'SPAGHETTI']), p(['MEAT', 'CHICKEN'])],
        [p(['KANIN', 'LONGANISA', 'EGG']), p(['GOOD AFTERNOON', 'SPAGHETTI', 'CHICKEN']), p(['SUNDAY', 'MAGULANG', 'SPAGHETTI'])],
      ),
      node(
        'u9-n3',
        'Seafood: Fish, Shrimp & Crab',
        [w('FISH'), w('SHRIMP'), w('CRAB'), w('FISH'), w('CRAB')],
        [p(['KANIN', 'FISH']), p(['SHRIMP', 'CRAB']), p(['FISH', 'SHRIMP']), p(['4', 'CRAB'])],
        [p(['KANIN', 'FISH', 'SHRIMP']), p(['HINDI', 'MEAT', 'FISH']), p(['GOOD EVENING', 'CRAB', 'SALAMAT'])],
      ),
      node(
        'u9-n4',
        'Unit 9 Checkpoint',
        [w('KANIN'), w('LONGANISA'), w('SPAGHETTI'), w('SHRIMP'), w('CRAB')],
        [p(['2', 'CHICKEN']), p(['BROWN', 'TINAPAY']), p(['WHITE', 'KANIN']), p(['SPAGHETTI', 'SALAMAT'])],
        [p(['HELLO', 'KANIN', 'LONGANISA', 'SALAMAT']), p(['NANAY', 'TATAY', 'KANIN', 'FISH']), p(['GOOD AFTERNOON', '1', 'KANIN', 'CHICKEN'])],
      ),
    ],
  },

  // =========================================================================
  // UNIT 10: DRINKS & FULL DIALOGUES (FINALE)
  // =========================================================================
  {
    id: 'unit-10-drinks',
    title: 'Inumin · Drinks & Orders',
    description: '',
    vocabulary: ['KAPE', 'GATAS', 'TEA', 'JUICE', 'HOT', 'COLD', 'SUGAR', 'NO SUGAR', 'BEER', 'WINE'],
    source: fslSource,
    lessons: [
      node(
        'u10-n1',
        'Coffee, Milk, Tea & Juice',
        [w('KAPE'), w('GATAS'), w('TEA'), w('JUICE'), w('KAPE')],
        [p(['KAPE', 'GATAS']), p(['TEA', 'JUICE']), p(['TINAPAY', 'GATAS']), p(['KANIN', 'KAPE'])],
        [p(['MAGANDANG UMAGA', 'KAPE', 'SALAMAT']), p(['GOOD AFTERNOON', 'JUICE', 'SALAMAT']), p(['MAGANDANG UMAGA', 'TINAPAY', 'GATAS'])],
      ),
      node(
        'u10-n2',
        'Hot, Cold, Sugar & No Sugar',
        [w('HOT'), w('COLD'), w('SUGAR'), w('NO SUGAR'), w('HOT')],
        [p(['HOT', 'KAPE']), p(['COLD', 'JUICE']), p(['HOT', 'TEA']), p(['COLD', 'GATAS'])],
        [p(['HOT', 'KAPE', 'NO SUGAR']), p(['HOT', 'KAPE', 'SUGAR']), p(['COLD', 'JUICE', 'NO SUGAR'])],
      ),
      node(
        'u10-n3',
        'Evening Drinks & Pairs',
        [w('BEER'), w('WINE'), w('COLD'), w('SUGAR'), w('NO SUGAR')],
        [p(['COLD', 'BEER']), p(['RED', 'WINE']), p(['WHITE', 'WINE']), p(['HOT', 'GATAS'])],
        [p(['TINAPAY', 'HOT', 'KAPE']), p(['GOOD EVENING', '2', 'COLD', 'BEER']), p(['FRIDAY', 'GOOD EVENING', 'RED', 'WINE'])],
      ),
      node(
        'u10-n4',
        'Grand FSL Checkpoint',
        [w('KAPE'), w('JUICE'), w('HOT'), w('COLD'), w('NO SUGAR')],
        [p(['2', 'KAPE']), p(['COLD', 'TEA']), p(['EGG', 'KAPE']), p(['SALAMAT', 'SEE YOU TOMORROW'])],
        [p(['MAGANDANG UMAGA', '2', 'HOT', 'KAPE']), p(['KAMUSTA', 'TATAY', 'HOT', 'KAPE']), p(['OO', 'NAIINTINDIHAN', 'SALAMAT', 'SEE YOU TOMORROW'])],
      ),
    ],
  },
]

export function courseForLang(lang: SignLang): CourseChapter[] {
  void lang
  return FSL_COURSE
}

export function signsFor(item: LessonItem): string[] {
  return item.signs?.length ? item.signs : [item.id]
}

export function findCourseLesson(lang: SignLang, chapterId: string, lessonId: string) {
  const chapter = courseForLang(lang).find(({ id }) => id === chapterId)
  const lesson = chapter?.lessons.find(({ id }) => id === lessonId)
  return chapter && lesson ? { chapter, lesson } : null
}

export type CourseProgress = Record<string, { completedAt: string; best: number; stars?: number }>

export function lessonKey(chapterId: string, lessonId: string) {
  return chapterId + '/' + lessonId
}

export function lessonStars(progress: CourseProgress, chapterId: string, lessonId: string): number {
  const rec = progress[lessonKey(chapterId, lessonId)]
  if (!rec) return 0
  return Math.max(1, Math.min(3, rec.stars ?? 1))
}

export function itemsForLesson(lesson: CourseLesson, stars: number): LessonItem[] {
  return lesson.levels[Math.max(0, Math.min(2, stars))]
}

export function getCourseProgress(lang: SignLang): CourseProgress {
  try {
    const value = JSON.parse(localStorage.getItem('signlens_course_v1_' + lang) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch { return {} }
}

export function completeCourseLesson(lang: SignLang, chapterId: string, lessonId: string, score: number, current: CourseProgress): CourseProgress {
  const key = lessonKey(chapterId, lessonId)
  const prevStars = current[key] ? Math.max(1, current[key].stars ?? 1) : 0
  if (score < 45 && prevStars === 0) return current
  const stars = Math.min(3, prevStars + (score >= 45 ? 1 : 0))
  const next = { ...current, [key]: { completedAt: new Date().toISOString(), best: Math.max(current[key]?.best ?? 0, score), stars } }
  try { localStorage.setItem('signlens_course_v1_' + lang, JSON.stringify(next)) } catch { /* local storage unavailable */ }
  return next
}

export function resetCourseProgress(lang: SignLang): CourseProgress {
  try { localStorage.removeItem('signlens_course_v1_' + lang) } catch { /* local storage unavailable */ }
  return {}
}
