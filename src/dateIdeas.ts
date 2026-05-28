export const categories = [
  "Home",
  "Outdoors",
  "Food",
  "Creative",
  "Movement",
  "Mini Adventure",
  "Culture",
  "Deep Talk",
  "Rainy Day",
  "Seasonal",
] as const;

export const budgets = ["Free", "Up to 15 EUR", "Up to 40 EUR", "Up to 100 EUR", "Unlimited"] as const;
export const durations = ["30 min", "60-90 min", "2-3 hours", "Half day", "Evening"] as const;

export type DateCategory = (typeof categories)[number];
export type Budget = (typeof budgets)[number];
export type Duration = (typeof durations)[number];

const budgetRank: Record<Budget, number> = {
  Free: 0,
  "Up to 15 EUR": 1,
  "Up to 40 EUR": 2,
  "Up to 100 EUR": 3,
  Unlimited: 4,
};

export type DateIdea = {
  id: string;
  family: string;
  title: string;
  prompt: string;
  category: DateCategory;
  budget: Budget;
  duration: Duration;
  prep: string;
  tags: string[];
};

type IdeaDraft = Omit<DateIdea, "id" | "family"> & {
  family?: string;
};

type ActivitySeed = IdeaDraft;

type TwistSeed = {
  label: string;
  detail: string;
  prep?: string;
  tag: string;
};

type ModeSeed = {
  label: string;
  detail: string;
  prep?: string;
  tag: string;
};

const idea = (
  title: string,
  prompt: string,
  category: DateCategory,
  budget: Budget,
  duration: Duration,
  prep: string,
  tags: string[] = [],
  family?: string,
): IdeaDraft => ({ title, prompt, category, budget, duration, prep, tags, family });

const activity = (
  title: string,
  action: string,
  category: DateCategory,
  budget: Budget,
  duration: Duration,
  prep: string,
  tags: string[],
): ActivitySeed => idea(title, action, category, budget, duration, prep, tags);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const familyFor = (entry: Pick<IdeaDraft, "family" | "title">) => entry.family ?? slugify(entry.title.split(":")[0]);

const concreteSteps: Record<DateCategory, string[]> = {
  Home: [
    "Set a start time, choose one room, and change three visible things before you begin.",
    "Use one tray or blanket as the date zone so it does not feel like a normal evening.",
    "Prepare the first ten minutes before your partner enters the room.",
    "End by choosing one object from the room as the memory marker for the date.",
  ],
  Outdoors: [
    "Pick a route with one clear stop: a bench, bridge, viewpoint, kiosk, garden, or quiet corner.",
    "Choose one photo target before leaving so the walk has a small mission.",
    "Set a turnaround point and make the way back a different route.",
    "Bring one drink and pause somewhere for at least twelve minutes instead of only walking past.",
  ],
  Food: [
    "Choose the place, recipe, or route before the date and decide what each person is responsible for.",
    "Order or make two different things and rate taste, price, atmosphere, and would-do-again.",
    "Pick one shared main thing plus one surprise side or dessert so the plan feels intentional.",
    "Write down the winner at the end so this can become a repeatable couple ritual.",
  ],
  Creative: [
    "Give the finished piece a name and decide where it lives afterward.",
    "Use a timer for the first draft so you do not overthink the result.",
    "Each person adds one detail the other person is not allowed to change.",
    "Take a final photo of the result and keep it as the date receipt.",
  ],
  Movement: [
    "Choose a low-pressure version and define the win as doing it together, not doing it well.",
    "Add one small checkpoint: best rally, best view, best laugh, or best recovery snack.",
    "Plan the calm-down stop before you start so the date has a soft ending.",
    "Pick equipment, route, and clothes before leaving so the date does not become logistics.",
  ],
  "Mini Adventure": [
    "Set a clear radius, one must-visit stop, and one optional stop before you leave.",
    "Let one person choose the first stop and the other choose the final snack or drink.",
    "Use public opening hours or transit times as the structure so it stays realistic.",
    "Make one tiny rule for the trip, such as no familiar streets or one photo per stop.",
  ],
  Culture: [
    "Before you enter, each person chooses one thing to look for: color, story, sound, detail, or mood.",
    "Keep the visit short enough that you still want to talk afterward.",
    "Afterward, each person names one thing they would keep, change, buy, recommend, or never repeat.",
    "Pair the visit with one nearby low-effort stop so the date has a clear ending.",
  ],
  "Deep Talk": [
    "Use one question only, then ask two follow-ups before moving on.",
    "Choose a place where neither of you feels trapped: a walk, bench, cafe corner, or kitchen table.",
    "End by naming one small action you can actually do this week.",
    "Keep the tone curious, not corrective, and pause if it starts feeling like a problem meeting.",
  ],
  "Rainy Day": [
    "Make the weather part of the plan: window seat, warm drink, dry route, or indoor backup.",
    "Prepare the cozy part first so the date starts smoothly.",
    "Choose one activity that still works if you only have ninety minutes.",
    "Keep towels, umbrella, warm socks, or a dry change ready if you go outside.",
  ],
  Seasonal: [
    "Choose one thing that only fits this season and make that the anchor of the date.",
    "Check timing first: light, weather, market hours, bloom, sunset, event slot, or temperature.",
    "Take one seasonal photo that would not make sense in another month.",
    "End with one plan for what you want to do before the season changes.",
  ],
};

const familySteps: Record<string, string[]> = {
  "air-dry-clay-portraits": [
    "Build for twenty minutes, then add one hidden detail that only the other person understands.",
    "Use two colors only and make the object small enough to keep on a shelf.",
  ],
  "knete-character-duel": [
    "Set a ten-minute timer and reveal both figures at the same time.",
    "Give each character a name, a superpower, and one ridiculous flaw.",
  ],
  "pottery-painting-studio": [
    "Pick an object you would use weekly, not a random souvenir.",
    "Choose one shared color palette before you start painting.",
  ],
  "canoe-ride": [
    "Choose a calm route with a clear turning point and one shore stop.",
    "Pack snacks in a dry bag and agree who steers first.",
  ],
  "pedal-boat-date": [
    "Pedal to the quietest corner and stop there for ten minutes.",
    "Bring one shared snack and choose a silly name for the boat.",
  ],
  "stand-up-paddle-tryout": [
    "Stay close to shore and make the first goal one calm kneeling lap.",
    "Take a break on land halfway through instead of forcing a long session.",
  ],
  "geocaching-hunt": [
    "Pick three caches before leaving and bring a tiny swap item.",
    "Let the person who finds the cache choose the next direction.",
  ],
  "restaurant-roulette": [
    "Check menu prices first, then roll between three restaurants that truly fit the budget.",
    "Reserve the winner immediately so the date does not become endless searching.",
  ],
  "sushi-rolling-class": [
    "Each person chooses one filling combo and names the best roll.",
    "Make one neat roll and one chaos roll, then taste both honestly.",
  ],
  "dumpling-folding-night": [
    "Fold at least twelve dumplings and choose a winner for shape, taste, and speed.",
    "Keep one filling simple and one filling experimental.",
  ],
  "pasta-from-scratch": [
    "Make the dough first, rest it, then cook one sauce while the other person rolls pasta.",
    "Keep the sauce simple so the handmade pasta is the main event.",
  ],
  "escape-room": [
    "Assign roles before entering: clue reader, lock tester, room scanner, and hint caller.",
    "Use one hint early if you are stuck so the date stays fun instead of frustrating.",
  ],
  "arcade-token-night": [
    "Split the tokens evenly and save the final two for a head-to-head game.",
    "Play one skill game, one racing game, one luck game, and one game neither of you understands.",
  ],
  "bowling-lane-date": [
    "Give each round a rule: weak hand, slow roll, trick pose, or winner chooses snack.",
    "Play only one or two games so it stays light.",
  ],
  "trampoline-park": [
    "Choose three tiny challenges: best jump, safest fall, and funniest landing.",
    "Book only one hour and plan a calm drink afterward.",
  ],
  "ice-skating": [
    "Start with one slow lap together before anyone tries to be impressive.",
    "Bring gloves and make the final lap the hand-holding lap.",
  ],
  "salsa-trial-class": [
    "Stand in the beginner row and agree that mistakes count as part of the date.",
    "After class, choose one move to repeat at home.",
  ],
  "aquarium-slow-walk": [
    "Each person picks one tank to watch for five full minutes.",
    "Choose the animal that matches your mood and explain why.",
  ],
  "planetarium-show": [
    "Before the show, each person names one place in the world or sky they want to see.",
    "Afterward, pick one future trip idea while the mood is still there.",
  ],
  "karaoke-booth": [
    "Queue three songs each: safe, brave, and ridiculous.",
    "End with one duet, even if neither of you can sing it well.",
  ],
  "flea-market-mission": [
    "Set a maximum price before entering and buy one tiny object for each other.",
    "The object has to be funny, useful, or weird enough to explain later.",
  ],
  "photo-booth-hunt": [
    "Take one serious strip and one strip with four deliberately bad poses.",
    "Write the date on the back before you put it away.",
  ],
  "board-game-cafe": [
    "Ask the staff for one cooperative game and one short competitive game.",
    "Stop after the best round instead of playing until the energy drops.",
  ],
  "indoor-mini-golf": [
    "Make one hole a trick-shot hole and one hole a silent-focus hole.",
    "Let the loser choose the next snack, not pay a penalty.",
  ],
  "strawberry-picking": [
    "Pick enough for one dessert and make that dessert the second half of the date.",
    "Choose the best-looking fruit together instead of racing through the field.",
  ],
  "outdoor-cinema-blanket-night": [
    "Arrive early enough to choose a comfortable spot and set up the blanket properly.",
    "Pack one quiet snack and one warm layer per person.",
  ],
};

function concreteStepFor(base: ActivitySeed, twist: TwistSeed, mode: ModeSeed) {
  const familySpecific = familySteps[familyFor(base)];
  if (familySpecific) {
    const index = (twist.label.length * 5 + mode.label.length * 7) % familySpecific.length;
    return familySpecific[index];
  }

  const steps = concreteSteps[base.category];
  const index = (base.title.length * 3 + twist.label.length * 5 + mode.label.length * 7) % steps.length;
  return steps[index];
}

function budgetFor(base: ActivitySeed, mode: ModeSeed): Budget {
  if (base.budget === "Unlimited") return "Unlimited";

  const premiumCategory = ["Food", "Movement", "Mini Adventure", "Culture", "Rainy Day", "Seasonal"].includes(base.category);
  const paidNightOut = /restaurant|chef|tasting|bar|cinema|concert|stage|bouldering|spa/i.test(base.title);

  if (mode.label === "Premium" && premiumCategory) {
    return base.budget === "Free" ? "Up to 40 EUR" : "Up to 100 EUR";
  }

  if (paidNightOut) return "Up to 100 EUR";

  return base.budget;
}

const curatedIdeas: IdeaDraft[] = [
  idea("Living Room Picnic", "Put a blanket on the floor, serve finger food, and play a playlist that feels like a tiny trip.", "Home", "Up to 15 EUR", "60-90 min", "Blanket, snacks, playlist", ["cozy", "food"]),
  idea("Phone-Free Restaurant Night", "Book a table and keep both phones away until the bill arrives.", "Food", "Up to 100 EUR", "Evening", "Reservation", ["classic", "talk"]),
  idea("Sunset Walk", "Leave early enough to find a place where you can watch the sky change together.", "Outdoors", "Free", "60-90 min", "Weather check, jacket", ["romantic", "nature"]),
  idea("Chef's Table Night", "Book a special menu and make it your intentional big date of the season.", "Food", "Unlimited", "Evening", "Reservation, dress code", ["premium", "dinner"]),
  idea("Museum With A Rule", "Visit a museum and each choose one piece that somehow describes the other person.", "Culture", "Up to 40 EUR", "2-3 hours", "Opening hours", ["art", "talk"]),
  idea("Rainy Window Cafe", "Find a cafe with a window seat and let the weather become part of the date.", "Rainy Day", "Up to 15 EUR", "60-90 min", "Cafe, umbrella", ["rain", "slow"]),
  idea("Neighborhood Micro Trip", "Spend a few hours in a nearby area you usually ignore and act like visitors.", "Mini Adventure", "Up to 100 EUR", "Half day", "Ticket or route", ["explore", "city"]),
  idea("Values Walk", "Walk slowly and talk through five values you want to see more often in your life together.", "Deep Talk", "Free", "60-90 min", "One quiet route", ["future", "relationship"]),
  idea("Kitchen Dance", "Pick three songs and dance without judging the moves.", "Movement", "Free", "30 min", "Playlist", ["music", "playful"]),
  idea("Make A Mini Film", "Shoot a 30-second trailer for your day and give it an overly dramatic title.", "Creative", "Free", "60-90 min", "Phone camera", ["film", "fun"]),
];

const activitySeeds: ActivitySeed[] = [
  activity("Candlelit Floor Dinner", "Set dinner on the floor instead of the table and make the room feel new.", "Home", "Up to 40 EUR", "Evening", "Blanket, candles, dinner", ["home", "romantic"]),
  activity("Blind Snack Tasting", "Prepare small bites and let one person guess flavors with closed eyes.", "Home", "Up to 15 EUR", "60-90 min", "Snacks, blindfold", ["playful", "taste"]),
  activity("Home Cinema Tickets", "Create homemade tickets, dim the lights, and treat a movie like a real screening.", "Home", "Up to 15 EUR", "Evening", "Movie, snacks, paper tickets", ["movie", "cozy"]),
  activity("Board Game Final", "Play three short rounds and let the winner choose a tiny reward.", "Home", "Free", "60-90 min", "Game, drinks", ["game", "playful"]),
  activity("Home Spa Reset", "Make a simple spa ritual with warm towels, tea, and calm music.", "Home", "Up to 40 EUR", "60-90 min", "Towels, tea, skincare", ["relax", "care"]),
  activity("Photo Memory Night", "Open old photos and tell the story behind each one.", "Home", "Free", "60-90 min", "Photos or gallery", ["memory", "talk"]),
  activity("Two-Course Challenge", "Each person makes one small course using a short ingredient list.", "Home", "Up to 40 EUR", "2-3 hours", "Ingredients, timer", ["cooking", "team"]),
  activity("Relationship Playlist", "Build a playlist together and explain why each song belongs there.", "Home", "Free", "60-90 min", "Music app, speaker", ["music", "deep"]),
  activity("Indoor Camp", "Build a cozy camp on the sofa, balcony, or floor and use only soft lighting.", "Home", "Free", "Evening", "Blankets, lamp", ["cozy", "adventure"]),
  activity("Breakfast At Midnight", "Make pancakes, eggs, or cereal at the wrong time of day.", "Home", "Up to 15 EUR", "60-90 min", "Breakfast ingredients", ["fun", "food"]),

  activity("Coin Flip Walk", "At every intersection, flip a coin to decide your direction.", "Outdoors", "Free", "60-90 min", "Coin, comfortable shoes", ["random", "walk"]),
  activity("Park Bench Coffee", "Bring coffee in cups and find the best bench in a park.", "Outdoors", "Up to 15 EUR", "60-90 min", "Coffee, jacket", ["park", "slow"]),
  activity("Waterfront Pause", "Sit by a river, lake, harbor, or fountain and stay long enough to settle.", "Outdoors", "Free", "60-90 min", "Drink, jacket", ["water", "romantic"]),
  activity("City Detail Hunt", "Take a walk and photograph small details you normally miss.", "Outdoors", "Free", "60-90 min", "Phone camera", ["city", "photo"]),
  activity("Night Lights Walk", "Walk a safe route after dark and look for the best light reflections.", "Outdoors", "Free", "60-90 min", "Safe route", ["night", "romantic"]),
  activity("Outdoor Reading", "Bring a book and read short sections aloud to each other outside.", "Outdoors", "Free", "60-90 min", "Book, blanket", ["quiet", "literary"]),
  activity("Picnic By The Water", "Pack simple food and eat near water, even if it is only a fountain.", "Outdoors", "Up to 40 EUR", "2-3 hours", "Blanket, snacks, bag", ["picnic", "food"]),
  activity("Favorite Places Tour", "Each person leads the other to one place that means something personal.", "Outdoors", "Free", "2-3 hours", "Two places", ["personal", "story"]),
  activity("Architecture Bingo", "Look for doors, balconies, signs, windows, and facades from a short bingo list.", "Outdoors", "Free", "60-90 min", "Bingo list", ["city", "design"]),
  activity("Sunrise Coffee", "Meet early for coffee and one quiet walk before the day starts.", "Outdoors", "Up to 15 EUR", "60-90 min", "Alarm, coffee", ["morning", "slow"]),

  activity("New Cuisine Night", "Cook a dish from a cuisine you rarely choose together.", "Food", "Up to 40 EUR", "2-3 hours", "Recipe, groceries", ["cooking", "discover"]),
  activity("Dessert First", "Make dessert the main plan and split two sweet options.", "Food", "Up to 15 EUR", "60-90 min", "Dessert idea", ["sweet", "fun"]),
  activity("Bakery Ranking", "Try small items from two or three bakeries and choose a winner.", "Food", "Up to 15 EUR", "60-90 min", "Route", ["city", "taste"]),
  activity("Market Breakfast", "Buy ingredients at a market and eat a simple breakfast nearby.", "Food", "Up to 40 EUR", "2-3 hours", "Market times", ["market", "morning"]),
  activity("Half-And-Half Pizza", "Each person creates one half of a pizza for the other.", "Food", "Up to 40 EUR", "2-3 hours", "Dough, toppings", ["cooking", "playful"]),
  activity("Food Truck Find", "Pick a food truck or tiny place neither of you knows.", "Food", "Up to 40 EUR", "60-90 min", "Opening hours", ["streetfood", "discover"]),
  activity("Spice Route Dinner", "Choose three spices and build a meal around them.", "Food", "Up to 40 EUR", "2-3 hours", "Spices, recipe", ["cooking", "scent"]),
  activity("Tapas Table", "Make many small plates instead of one big meal.", "Food", "Up to 40 EUR", "2-3 hours", "Small plates, groceries", ["sharing", "taste"]),
  activity("Chef's Table", "Book a special tasting menu or restaurant you would not choose on an ordinary night.", "Food", "Unlimited", "Evening", "Reservation, outfit", ["premium", "dinner"]),
  activity("Mocktail Lab", "Mix two drinks and pair each one with a small snack.", "Food", "Up to 15 EUR", "30 min", "Drinks, snack", ["drink", "playful"]),

  activity("Tiny Portrait Session", "Draw each other in ten minutes and keep both drawings.", "Creative", "Free", "30 min", "Paper, pens", ["art", "fun"]),
  activity("Ceramic Keepsake", "Paint or shape a small item you can actually use later.", "Creative", "Up to 100 EUR", "2-3 hours", "Studio or materials", ["craft", "memory"]),
  activity("Couple Collage", "Collect images, words, and colors that fit your next season together.", "Creative", "Up to 15 EUR", "2-3 hours", "Paper or tablet", ["future", "design"]),
  activity("Postcard To Future You", "Design a postcard and send or hide it for a later date.", "Creative", "Up to 15 EUR", "60-90 min", "Card, stamp, pen", ["analog", "memory"]),
  activity("Playlist Cover", "Create a shared playlist and design a cover photo for it.", "Creative", "Free", "60-90 min", "Music app, camera", ["music", "design"]),
  activity("Short Story Relay", "Write a story together by adding three sentences at a time.", "Creative", "Free", "60-90 min", "Notes app", ["writing", "fun"]),
  activity("DIY Gift Build", "Make a small useful object or gift from simple materials.", "Creative", "Up to 40 EUR", "2-3 hours", "Materials, tutorial", ["craft", "gift"]),
  activity("Photo Emotion Set", "Take photos for six emotions: calm, wild, warm, new, strange, familiar.", "Creative", "Free", "2-3 hours", "Camera", ["photo", "creative"]),
  activity("Window Art", "Draw temporary symbols on a window or mirror and photograph them before cleaning.", "Creative", "Up to 15 EUR", "30 min", "Window markers", ["art", "home"]),
  activity("Make A Date Jar", "Write future date ideas on slips and decorate a jar together.", "Creative", "Up to 15 EUR", "60-90 min", "Jar, paper, pens", ["planning", "craft"]),

  activity("Kitchen Dance Break", "Choose three songs and dance in the kitchen without rating the moves.", "Movement", "Free", "30 min", "Playlist", ["music", "movement"]),
  activity("Park Badminton", "Play casually in a park and count longest rallies, not points.", "Movement", "Up to 15 EUR", "60-90 min", "Rackets, shuttle", ["park", "game"]),
  activity("Mini Golf", "Play a round and let the loser pick the next snack.", "Movement", "Up to 40 EUR", "2-3 hours", "Opening hours", ["playful", "sport"]),
  activity("Bike Without A Goal", "Ride in one direction for a while and stop wherever it feels good.", "Movement", "Free", "2-3 hours", "Bikes, water", ["bike", "outdoors"]),
  activity("Bouldering Tryout", "Try an easy bouldering session and rate courage instead of performance.", "Movement", "Up to 100 EUR", "2-3 hours", "Gym, sportswear", ["team", "sport"]),
  activity("Swim And Snack", "Go swimming and finish with a simple snack afterward.", "Movement", "Up to 40 EUR", "Half day", "Swimwear, towel", ["water", "sport"]),
  activity("Couple Yoga", "Follow a short stretching or yoga session where laughing is allowed.", "Movement", "Free", "30 min", "Mat, video", ["relax", "home"]),
  activity("10,000 Step Talk", "Walk a long route and pause after each milestone for one question.", "Movement", "Free", "2-3 hours", "Step counter", ["walk", "talk"]),
  activity("Roller Route", "Use skates, scooters, or bikes on a safe flat route.", "Movement", "Up to 40 EUR", "60-90 min", "Helmet, route", ["playful", "outdoors"]),
  activity("Stairs With A View", "Find a long staircase or hill and enjoy the view at the top.", "Movement", "Free", "30 min", "Comfortable shoes", ["short", "city"]),

  activity("Random Train Stop", "Ride a few stops and explore the area like visitors.", "Mini Adventure", "Up to 15 EUR", "2-3 hours", "Ticket, return plan", ["random", "city"]),
  activity("Secondhand Mission", "Set a small budget and find a funny or thoughtful item for each other.", "Mini Adventure", "Up to 15 EUR", "2-3 hours", "Secondhand store", ["gift", "playful"]),
  activity("Viewpoint Hunt", "Find the highest reachable point nearby and make it the destination.", "Mini Adventure", "Free", "2-3 hours", "Map, water", ["view", "outdoors"]),
  activity("Neighbor Town Trip", "Spend a few hours in a nearby town you normally skip.", "Mini Adventure", "Up to 100 EUR", "Half day", "Ticket or car", ["trip", "new"]),
  activity("Three Secret Stops", "One person plans three stops and reveals them only on the way.", "Mini Adventure", "Up to 40 EUR", "2-3 hours", "Route, stops", ["surprise", "city"]),
  activity("Hotel Bar Without Hotel", "Dress a little nicer and have one drink somewhere that feels special.", "Mini Adventure", "Up to 100 EUR", "Evening", "Bar, outfit", ["premium", "city"]),
  activity("Nearby Staycation", "Book a special place nearby and treat it like a tiny vacation.", "Mini Adventure", "Unlimited", "Half day", "Booking, overnight bag", ["luxury", "trip"]),
  activity("Star Spot", "Go to a darker place and stay long enough to look up properly.", "Mini Adventure", "Free", "Evening", "Blanket, weather check", ["night", "romantic"]),
  activity("Street Name Quest", "Choose a street name on the map that sounds interesting and walk there.", "Mini Adventure", "Free", "60-90 min", "Map", ["random", "walk"]),
  activity("Fixed Budget Challenge", "Set one shared spending limit and see how much afternoon you can create from it.", "Mini Adventure", "Up to 40 EUR", "Half day", "Cash or card", ["budget", "playful"]),

  activity("Small Gallery Hop", "Visit a small gallery and decide which work you would take home.", "Culture", "Free", "60-90 min", "Gallery times", ["art", "city"]),
  activity("Bookstore Pick", "Choose one book you think the other person should read.", "Culture", "Free", "60-90 min", "Bookstore", ["books", "quiet"]),
  activity("Blind Cinema", "Pick a movie you know almost nothing about and talk about the feeling after.", "Culture", "Up to 40 EUR", "Evening", "Movie times", ["film", "surprise"]),
  activity("Small Stage Night", "Try a local theater, poetry night, comedy room, or open mic.", "Culture", "Up to 40 EUR", "Evening", "Event calendar", ["stage", "night"]),
  activity("Live Music Find", "Go to a small concert or live session instead of a big event.", "Culture", "Up to 40 EUR", "Evening", "Tickets or calendar", ["music", "culture"]),
  activity("Historic Spot Walk", "Visit a historic place nearby and read a few lines about what happened there.", "Culture", "Free", "60-90 min", "Map, short article", ["history", "walk"]),
  activity("Museum Slow Route", "Visit fewer rooms and spend more time with fewer works.", "Culture", "Up to 40 EUR", "2-3 hours", "Opening hours", ["museum", "slow"]),
  activity("Opera Or Big Stage", "If budget is open, plan a full culture night with strong seats and dinner.", "Culture", "Unlimited", "Evening", "Tickets, reservation", ["premium", "culture"]),
  activity("Record Store Browse", "Listen to music you would normally not choose.", "Culture", "Free", "60-90 min", "Record store", ["music", "discover"]),
  activity("Short Film Night", "Watch three short films and rate each with one sentence.", "Culture", "Free", "60-90 min", "Short film source", ["film", "home"]),

  activity("One Good Question Walk", "Walk slowly and answer one meaningful question without rushing.", "Deep Talk", "Free", "60-90 min", "One question", ["talk", "outdoors"]),
  activity("Gratitude Round", "Name five specific things you appreciated about each other recently.", "Deep Talk", "Free", "30 min", "Quiet place", ["appreciation", "close"]),
  activity("Letter To Us", "Write a short letter to your future selves and seal it.", "Deep Talk", "Free", "60-90 min", "Paper, envelope", ["future", "analog"]),
  activity("Values Sort", "Choose your shared top five values and talk about how they show up.", "Deep Talk", "Free", "60-90 min", "Values list", ["clarity", "future"]),
  activity("Love Languages Check", "Talk about which everyday gestures actually land for each of you.", "Deep Talk", "Free", "60-90 min", "Notes", ["relationship", "learn"]),
  activity("No-Problem Planning", "Talk only about what would make your relationship easier, not about blame.", "Deep Talk", "Free", "60-90 min", "Notes", ["planning", "calm"]),
  activity("First-Time Interview", "Interview each other about first trips, first homes, or first crushes.", "Deep Talk", "Free", "60-90 min", "Questions", ["story", "talk"]),
  activity("Silent Minute", "Sit quietly together for a few minutes and then describe what you noticed.", "Deep Talk", "Free", "30 min", "Timer", ["mindful", "close"]),
  activity("Boundary And Wish Check", "Name three things you want more of and three things you want less of.", "Deep Talk", "Free", "60-90 min", "Notes", ["clarity", "relationship"]),
  activity("Future Map", "Draw a map of the next twelve months with places, wishes, and risks.", "Deep Talk", "Free", "60-90 min", "Paper, pens", ["future", "planning"]),

  activity("Rain Cafe", "Sit by a cafe window and watch the street for twenty minutes.", "Rainy Day", "Up to 15 EUR", "60-90 min", "Cafe, umbrella", ["rain", "slow"]),
  activity("Blanket Fort", "Build a soft indoor corner and keep the date screen-light only if needed.", "Rainy Day", "Free", "Evening", "Blankets, pillows", ["cozy", "home"]),
  activity("Hot Chocolate Test", "Make two versions of hot chocolate and score warmth, taste, and mood.", "Rainy Day", "Up to 15 EUR", "30 min", "Milk, cocoa, toppings", ["warm", "sweet"]),
  activity("Indoor Escape Puzzle", "Play a printable or app-based escape puzzle together.", "Rainy Day", "Up to 40 EUR", "2-3 hours", "Puzzle set", ["team", "mystery"]),
  activity("Podcast Pause Date", "Listen to a podcast and pause three times for your own views.", "Rainy Day", "Free", "60-90 min", "Podcast, tea", ["talk", "home"]),
  activity("Museum Instead Of Park", "Choose the smallest museum nearby and make bad weather irrelevant.", "Rainy Day", "Up to 40 EUR", "2-3 hours", "Opening hours", ["culture", "weatherproof"]),
  activity("Window Reading", "Read near a window and each summarize the best passage.", "Rainy Day", "Free", "60-90 min", "Books, tea", ["reading", "quiet"]),
  activity("Spa Upgrade", "If budget is open, book a spa, thermal bath, or massage and make the day slow.", "Rainy Day", "Unlimited", "Half day", "Booking, swimwear", ["luxury", "relax"]),
  activity("Closet Styling Show", "Style outfits for each other from clothes you already own.", "Rainy Day", "Free", "60-90 min", "Closet", ["fun", "home"]),
  activity("Pasta And Puzzle", "Cook pasta and build the first part of a puzzle while it cools.", "Rainy Day", "Up to 15 EUR", "2-3 hours", "Puzzle, pasta", ["cozy", "food"]),

  activity("Spring Bloom Route", "Find three blooming spots and take one photo at each.", "Seasonal", "Free", "60-90 min", "Route, camera", ["spring", "nature"]),
  activity("First Warm Evening", "Move a simple dinner or drink outside and stay until it gets cooler.", "Seasonal", "Up to 15 EUR", "Evening", "Drink, blanket", ["summer", "outdoors"]),
  activity("Ice Cream Ranking", "Try two flavors or two shops and choose the winner.", "Seasonal", "Up to 15 EUR", "60-90 min", "Ice cream shops", ["summer", "taste"]),
  activity("Autumn Color Walk", "Search for five colors outside and photograph each one.", "Seasonal", "Free", "60-90 min", "Camera, jacket", ["autumn", "photo"]),
  activity("Pumpkin Or Lantern Date", "Carve, paint, or decorate something seasonal.", "Seasonal", "Up to 15 EUR", "60-90 min", "Pumpkin or materials", ["autumn", "creative"]),
  activity("Winter Light Route", "Walk through lit streets and bring something warm to drink.", "Seasonal", "Up to 15 EUR", "60-90 min", "Thermos", ["winter", "romantic"]),
  activity("Seasonal Market", "Visit a weekly, flower, night, or holiday market and share small things.", "Seasonal", "Up to 40 EUR", "2-3 hours", "Market times", ["market", "food"]),
  activity("Seasonal Ingredient Dinner", "Cook a meal around one ingredient that is in season.", "Seasonal", "Up to 40 EUR", "2-3 hours", "Seasonal ingredient", ["cooking", "seasonal"]),
  activity("Holiday Event Trip", "If budget is open, book a seasonal event or short trip and make it intentional.", "Seasonal", "Unlimited", "Half day", "Booking, date", ["premium", "seasonal"]),
  activity("Letter To Next Season", "Write what you want to experience before the next season starts.", "Seasonal", "Free", "60-90 min", "Paper, envelope", ["future", "deep"]),

  activity("Air-Dry Clay Portraits", "Buy air-dry clay and sculpt a tiny portrait, animal, or symbol for the other person.", "Creative", "Up to 15 EUR", "60-90 min", "Air-dry clay, table cover, wet cloth", ["clay", "craft"]),
  activity("Knete Character Duel", "Use modeling clay and build each other as a tiny character with three exaggerated details.", "Creative", "Up to 15 EUR", "60-90 min", "Modeling clay, timer, tray", ["clay", "playful"]),
  activity("Pottery Painting Studio", "Book a pottery painting slot and paint mugs, plates, or bowls you can actually use.", "Creative", "Up to 100 EUR", "2-3 hours", "Studio booking, simple motif idea", ["pottery", "craft"]),
  activity("Candle Making Workshop", "Make two candles with different scents and name them after an inside joke.", "Creative", "Up to 100 EUR", "2-3 hours", "Workshop booking", ["workshop", "scent"]),
  activity("Tufting Mini Rug", "Book a tufting session and make a small rug or wall piece together.", "Creative", "Up to 100 EUR", "Half day", "Workshop booking, design idea", ["workshop", "design"]),
  activity("Lego Memory Build", "Build a tiny Lego scene of a real memory you share and explain every detail.", "Creative", "Up to 40 EUR", "60-90 min", "Small brick set or loose bricks", ["building", "memory"]),
  activity("Thrifted Outfit Styling", "Go to a thrift store and style one outfit for the other person within a fixed budget.", "Creative", "Up to 40 EUR", "2-3 hours", "Secondhand store, budget", ["style", "playful"]),
  activity("Analog Photo Walk", "Use a disposable camera or instant camera and take twelve intentional photos only.", "Creative", "Up to 40 EUR", "2-3 hours", "Camera, route", ["photo", "analog"]),
  activity("Paint And Sip At Home", "Paint the same simple object while sharing one bottle, tea, or mocktails.", "Creative", "Up to 40 EUR", "2-3 hours", "Canvas or paper, paint, drinks", ["paint", "home"]),
  activity("Make Matching Keychains", "Make two keychains from beads, shrink plastic, clay, leather, or cord.", "Creative", "Up to 15 EUR", "60-90 min", "Key rings, material kit", ["craft", "gift"]),

  activity("Canoe Ride", "Rent a canoe and paddle a calm route with one planned snack stop on the shore.", "Outdoors", "Up to 100 EUR", "2-3 hours", "Canoe rental, dry bag, water", ["canoe", "water"]),
  activity("Pedal Boat Date", "Rent a pedal boat and bring one drink or snack for the middle of the lake.", "Outdoors", "Up to 40 EUR", "60-90 min", "Boat rental, weather check", ["water", "playful"]),
  activity("Stand-Up Paddle Tryout", "Rent paddleboards or book a beginner slot and keep the goal simple: stay up and laugh.", "Movement", "Up to 100 EUR", "2-3 hours", "SUP rental, swimwear, towel", ["water", "sport"]),
  activity("Geocaching Hunt", "Find three nearby geocaches and sign the logbook together.", "Outdoors", "Free", "2-3 hours", "Geocaching app, pen, small swap item", ["treasure", "walk"]),
  activity("Kite Flying Field", "Buy or borrow a kite and test it in an open field or beach area.", "Outdoors", "Up to 15 EUR", "60-90 min", "Kite, wind check", ["wind", "playful"]),
  activity("Botanical Garden Route", "Visit a botanical garden and choose the plant that best fits each other.", "Outdoors", "Up to 40 EUR", "2-3 hours", "Tickets, opening hours", ["nature", "garden"]),
  activity("Animal Shelter Walk Help", "Ask a local shelter whether you can help walk dogs or support a public volunteer slot.", "Outdoors", "Free", "2-3 hours", "Shelter rules, booking if needed", ["kindness", "outdoors"]),
  activity("Ferry Ride Without Destination", "Take a ferry or river bus just for the ride and get off only if a stop looks good.", "Mini Adventure", "Up to 40 EUR", "2-3 hours", "Ferry tickets, timetable", ["water", "trip"]),
  activity("Rooftop View Coffee", "Find a rooftop cafe, public terrace, or high parking deck view and drink coffee there.", "Mini Adventure", "Up to 40 EUR", "60-90 min", "Viewpoint, coffee", ["view", "city"]),
  activity("Sunset Blanket Hill", "Choose a hill or open field, bring a blanket, and arrive twenty minutes before sunset.", "Outdoors", "Free", "60-90 min", "Blanket, sunset time", ["sunset", "romantic"]),

  activity("Restaurant Roulette", "Pick three restaurants you would actually afford, roll a die, and book the winner.", "Food", "Up to 100 EUR", "Evening", "Three restaurant options, reservation", ["restaurant", "dinner"]),
  activity("Sushi Rolling Class", "Book a sushi course or make sushi at home with a bamboo mat and simple fillings.", "Food", "Up to 100 EUR", "2-3 hours", "Class booking or sushi kit", ["sushi", "workshop"]),
  activity("Dumpling Folding Night", "Fold dumplings together and compare shapes before cooking them.", "Food", "Up to 40 EUR", "2-3 hours", "Wrappers, filling, dipping sauce", ["cooking", "hands-on"]),
  activity("Pasta From Scratch", "Make fresh pasta dough, roll it by hand, and serve it with one simple sauce.", "Food", "Up to 40 EUR", "2-3 hours", "Flour, eggs, sauce ingredients", ["cooking", "pasta"]),
  activity("Ramen Shop Crawl", "Try one small ramen, bao, or side dish at two different places and choose a winner.", "Food", "Up to 100 EUR", "2-3 hours", "Two places, opening hours", ["restaurant", "taste"]),
  activity("Breakfast Diner Date", "Go out for pancakes, eggs, or waffles and order one plate to split.", "Food", "Up to 40 EUR", "60-90 min", "Diner or breakfast cafe", ["breakfast", "classic"]),
  activity("Cooking Class", "Book a real cooking class and choose a cuisine neither of you cooks at home.", "Food", "Up to 100 EUR", "2-3 hours", "Class booking", ["workshop", "cooking"]),
  activity("Picnic Charcuterie Board", "Build a small cheese, fruit, bread, and dip board and eat it outside.", "Food", "Up to 40 EUR", "60-90 min", "Board ingredients, blanket", ["picnic", "sharing"]),
  activity("Midnight Fries Run", "Go out late for fries, kebab, tacos, or noodles and make it the whole date.", "Food", "Up to 15 EUR", "30 min", "Open late spot", ["streetfood", "night"]),
  activity("Blind Menu Pick", "At a trusted restaurant, each person orders one dish for the other person.", "Food", "Up to 100 EUR", "Evening", "Reservation, allergy check", ["restaurant", "surprise"]),

  activity("Escape Room", "Book an escape room and choose one that fits your experience level.", "Mini Adventure", "Up to 100 EUR", "60-90 min", "Escape room booking", ["puzzle", "team"]),
  activity("Arcade Token Night", "Set a token budget and play air hockey, racing, claw machines, and one silly game.", "Mini Adventure", "Up to 40 EUR", "60-90 min", "Arcade, token budget", ["arcade", "playful"]),
  activity("Bowling Lane Date", "Book one bowling lane and make each round have a different rule.", "Movement", "Up to 40 EUR", "60-90 min", "Bowling booking, socks", ["bowling", "game"]),
  activity("Trampoline Park", "Book one trampoline park hour and end with a drink while you recover.", "Movement", "Up to 40 EUR", "60-90 min", "Booking, sport clothes", ["jump", "playful"]),
  activity("Ice Skating", "Go ice skating and define success as one full lap holding hands.", "Movement", "Up to 40 EUR", "60-90 min", "Rink times, gloves", ["ice", "winter"]),
  activity("Roller Disco", "Find a roller rink or smooth route and skate with a playlist.", "Movement", "Up to 40 EUR", "60-90 min", "Skate rental or skates", ["skating", "music"]),
  activity("Archery Trial", "Book a beginner archery lane and name each target round after a shared goal.", "Movement", "Up to 100 EUR", "60-90 min", "Archery booking", ["archery", "focus"]),
  activity("Salsa Trial Class", "Book a beginner salsa, bachata, or swing class and go for one drink after.", "Movement", "Up to 40 EUR", "2-3 hours", "Dance class booking", ["dance", "music"]),
  activity("Climbing Gym Route Swap", "Go to a climbing or bouldering gym and each choose one easy route for the other.", "Movement", "Up to 100 EUR", "2-3 hours", "Gym booking, sportswear", ["climbing", "team"]),
  activity("Table Tennis Bar", "Book a ping-pong table and play short rounds with tiny rewards.", "Movement", "Up to 40 EUR", "60-90 min", "Table booking", ["game", "bar"]),

  activity("Aquarium Slow Walk", "Visit an aquarium and each pick the creature that looks most like your mood.", "Culture", "Up to 100 EUR", "2-3 hours", "Aquarium tickets", ["aquarium", "slow"]),
  activity("Planetarium Show", "Book a planetarium show and talk afterward about where you want to travel together.", "Culture", "Up to 40 EUR", "2-3 hours", "Planetarium tickets", ["stars", "future"]),
  activity("Comedy Night", "Book a small comedy night and choose one joke afterward that will become an inside joke.", "Culture", "Up to 40 EUR", "Evening", "Tickets, show time", ["comedy", "night"]),
  activity("Jazz Bar", "Go to a small jazz bar or live music room and stay for one full set.", "Culture", "Up to 100 EUR", "Evening", "Table or tickets", ["music", "bar"]),
  activity("Karaoke Booth", "Rent a private karaoke room and each queue three songs: safe, brave, and ridiculous.", "Culture", "Up to 100 EUR", "2-3 hours", "Karaoke booking, song list", ["karaoke", "music"]),
  activity("Local Sports Game", "Watch a local football, basketball, hockey, or handball game and pick a team for the night.", "Culture", "Up to 40 EUR", "2-3 hours", "Tickets, team colors", ["sport", "local"]),
  activity("Open Studio Visit", "Visit an artist studio, maker space, or open atelier day and choose one technique to try later.", "Culture", "Free", "60-90 min", "Open studio schedule", ["art", "workshop"]),
  activity("Library Treasure Hunt", "Go to a library and each finds one book, one quote, and one cover for the other.", "Culture", "Free", "60-90 min", "Library card if needed", ["books", "quiet"]),
  activity("Street Art Route", "Walk a street art route and rate murals by color, story, and photo potential.", "Culture", "Free", "2-3 hours", "Route, camera", ["streetart", "walk"]),
  activity("Drive-In Cinema", "Go to a drive-in cinema or outdoor screening and bring a blanket and snacks.", "Culture", "Up to 40 EUR", "Evening", "Tickets, blanket, snacks", ["film", "outdoors"]),

  activity("Flea Market Mission", "Go to a flea market and buy the best tiny object for each other under a fixed price.", "Mini Adventure", "Up to 15 EUR", "2-3 hours", "Cash, market hours", ["market", "gift"]),
  activity("IKEA Showroom Date", "Walk through a furniture showroom and design a fake apartment for your future selves.", "Mini Adventure", "Free", "60-90 min", "Store route, snack stop", ["design", "future"]),
  activity("Airport Watching", "Go to an airport viewpoint or train station and invent trips for the next three departures.", "Mini Adventure", "Free", "60-90 min", "Viewpoint, timetable", ["travel", "story"]),
  activity("Random Bus Line", "Take a bus line you never use for six stops and explore where you land.", "Mini Adventure", "Up to 15 EUR", "2-3 hours", "Transit tickets, return route", ["random", "city"]),
  activity("Local Landmark Bingo", "Make a bingo card of five local landmarks and visit them in one walk.", "Mini Adventure", "Free", "2-3 hours", "Landmark list, map", ["city", "game"]),
  activity("Tiny Hotel Lobby Coffee", "Dress up slightly and have coffee in a hotel lobby, museum cafe, or elegant public lounge.", "Mini Adventure", "Up to 40 EUR", "60-90 min", "Lobby or lounge option", ["style", "coffee"]),
  activity("Book A One-Night Cabin", "Book a nearby cabin, tiny house, or countryside room and cook one simple meal there.", "Mini Adventure", "Unlimited", "Half day", "Booking, overnight bag, groceries", ["trip", "premium"]),
  activity("Photo Booth Hunt", "Find an old photo booth and take one serious strip and one ridiculous strip.", "Mini Adventure", "Up to 15 EUR", "60-90 min", "Photo booth location, coins", ["photo", "playful"]),
  activity("Record Store Challenge", "Each person picks one record cover for the other without listening first.", "Mini Adventure", "Free", "60-90 min", "Record store", ["music", "design"]),
  activity("Night Market Snack Route", "Visit a night market or food hall and split three small dishes from different stands.", "Mini Adventure", "Up to 40 EUR", "2-3 hours", "Market hours, budget", ["market", "streetfood"]),

  activity("Indoor Picnic With Kinetic Sand", "Make an indoor picnic and build tiny landscapes from kinetic sand between courses.", "Rainy Day", "Up to 15 EUR", "60-90 min", "Kinetic sand, tray, picnic food", ["hands-on", "home"]),
  activity("Puzzle Race", "Buy two small puzzles with the same piece count and race for twenty minutes.", "Rainy Day", "Up to 15 EUR", "60-90 min", "Two puzzles, timer", ["puzzle", "playful"]),
  activity("Board Game Cafe", "Go to a board game cafe and let the staff recommend one cooperative game.", "Rainy Day", "Up to 40 EUR", "2-3 hours", "Cafe booking or opening hours", ["game", "cafe"]),
  activity("Indoor Mini Golf", "Play indoor mini golf, blacklight golf, or a similar weatherproof course.", "Rainy Day", "Up to 40 EUR", "60-90 min", "Booking, comfortable shoes", ["minigolf", "weatherproof"]),
  activity("Thermal Bath Evening", "Book a thermal bath or sauna evening and keep the plan slow.", "Rainy Day", "Up to 100 EUR", "Evening", "Tickets, swimwear, towels", ["spa", "relax"]),
  activity("At-Home Ramen Bar", "Build ramen bowls with toppings in separate small bowls and assemble them together.", "Rainy Day", "Up to 40 EUR", "2-3 hours", "Noodles, broth, toppings", ["cooking", "warm"]),
  activity("Blank Canvas Swap", "Paint for ten minutes, swap canvases, and continue the other person's picture.", "Rainy Day", "Up to 15 EUR", "60-90 min", "Paint, paper or canvas, timer", ["paint", "team"]),
  activity("Indoor Plant Repotting", "Buy one plant or repot plants you own and name them together.", "Rainy Day", "Up to 40 EUR", "60-90 min", "Plant, soil, pot, gloves", ["plant", "home"]),

  activity("Strawberry Picking", "Go strawberry, apple, berry, or flower picking and make dessert afterward.", "Seasonal", "Up to 40 EUR", "Half day", "Farm opening hours, containers", ["seasonal", "food"]),
  activity("Pumpkin Patch Trip", "Visit a pumpkin patch, choose one pumpkin each, and carve or paint them later.", "Seasonal", "Up to 40 EUR", "Half day", "Farm hours, car or transit", ["autumn", "creative"]),
  activity("Christmas Light Walk", "Walk a decorated street or light route and bring hot drinks in a thermos.", "Seasonal", "Free", "60-90 min", "Light route, thermos", ["winter", "romantic"]),
  activity("Outdoor Cinema Blanket Night", "Go to an outdoor cinema and bring a blanket, snacks, and one backup layer.", "Seasonal", "Up to 40 EUR", "Evening", "Tickets, blanket, snacks", ["film", "summer"]),
  activity("Flower Field Photos", "Visit a flower field or public garden and take three non-cringey couple photos.", "Seasonal", "Up to 15 EUR", "60-90 min", "Field location, camera", ["flowers", "photo"]),
  activity("Lake Swim Morning", "Go to a lake early, swim or sit with feet in the water, and bring breakfast.", "Seasonal", "Up to 15 EUR", "60-90 min", "Swimwear, towel, breakfast", ["summer", "water"]),
];

const twistSeeds: TwistSeed[] = [
  { label: "Phone-Free", detail: "Keep both phones away until the end and decide beforehand who watches the time.", prep: "Phones on silent", tag: "offline" },
  { label: "Three Questions", detail: "Bring three questions: one light, one brave, and one you rarely ask.", prep: "Three questions", tag: "talk" },
  { label: "Surprise Start", detail: "One person plans the first step and the other only learns it on the way.", prep: "One secret start", tag: "surprise" },
  { label: "One Photo", detail: "Take exactly one photo that captures the mood, not just your faces.", prep: "Camera", tag: "photo" },
  { label: "Tiny Bet", detail: "Add a harmless bet and let the winner choose a small wish.", prep: "Small wish", tag: "playful" },
  { label: "Memory Link", detail: "Connect it to an old memory and talk about what has changed since then.", prep: "One memory", tag: "memory" },
  { label: "Slow Version", detail: "Plan less, stay longer in one place, and allow pauses.", prep: "No next appointment", tag: "slow" },
  { label: "Wish List Finish", detail: "Write down one thing you want to do together more often.", prep: "Notes app", tag: "future" },
  { label: "Role Swap", detail: "One person chooses the beginning and the other chooses the ending.", prep: "Start and finish", tag: "team" },
  { label: "Mini Souvenir", detail: "Create or take one small memory from the date without buying something unnecessary.", prep: "Souvenir idea", tag: "memory" },
  { label: "Budget Rule", detail: "Set a clear small budget and use it as a creativity constraint.", prep: "Budget", tag: "budget" },
  { label: "Compliment End", detail: "End with one specific compliment that the other person can actually believe.", prep: "One honest sentence", tag: "appreciation" },
  { label: "Timer Flow", detail: "Use one timer for the activity and one timer for talking.", prep: "Timer", tag: "focus" },
  { label: "Music Cue", detail: "Pick one song to start the date and one song to end it.", prep: "Two songs", tag: "music" },
  { label: "Future Question", detail: "Tie it to the question: what should we have experienced together three months from now?", prep: "One future question", tag: "future" },
  { label: "Kindness Task", detail: "Add one small kind action for each other during the date.", prep: "One kind action", tag: "care" },
  { label: "Local Only", detail: "Choose the closest good version of this idea instead of making it complicated.", prep: "Nearby option", tag: "easy" },
  { label: "Dress Code", detail: "Set a tiny dress code: one color, one accessory, or one mood.", prep: "Dress cue", tag: "style" },
];

const modeSeeds: ModeSeed[] = [
  { label: "Easy", detail: "Keep it simple enough that you would still do it on a normal weekday.", tag: "easy" },
  { label: "Romantic", detail: "Add one thoughtful detail: warm light, a note, a favorite snack, or a small ritual.", prep: "Thoughtful detail", tag: "romantic" },
  { label: "Playful", detail: "Add a tiny challenge, score, or silly rule so the date has energy.", prep: "Small rule", tag: "playful" },
  { label: "Deep Talk", detail: "Pause once and ask what this moment says about what you want more of together.", prep: "One deep question", tag: "deep" },
  { label: "Memory", detail: "Save one trace of it so you can return to the date later.", prep: "Memory note", tag: "memory" },
  { label: "Premium", detail: "If you want to spend more, upgrade one part: location, comfort, food, or timing.", prep: "Optional upgrade", tag: "premium" },
  { label: "First-Date Friendly", detail: "Keep the plan public, light, and easy to leave if either person needs to.", prep: "Public place", tag: "safe" },
  { label: "Anniversary", detail: "Connect the date to something you have already lived through together.", prep: "Shared memory", tag: "anniversary" },
];

const generatedIdeas: IdeaDraft[] = activitySeeds.flatMap((base) =>
  twistSeeds.flatMap((twist) =>
    modeSeeds.map((mode) =>
      idea(
        `${base.title}: ${twist.label} ${mode.label}`,
        `${base.prompt} ${concreteStepFor(base, twist, mode)} ${twist.detail} ${mode.detail}`,
        base.category,
        budgetFor(base, mode),
        base.duration,
        [base.prep, twist.prep, mode.prep].filter(Boolean).join(", "),
        [...new Set([...base.tags, twist.tag, mode.tag])],
        familyFor(base),
      ),
    ),
  ),
);

const allIdeas = [...curatedIdeas, ...generatedIdeas];

export const dateIdeas: DateIdea[] = allIdeas.map((entry, index) => ({
  id: `date-${String(index + 1).padStart(5, "0")}`,
  ...entry,
  family: familyFor(entry),
}));

export type IdeaFilters = {
  category: DateCategory | "All";
  budget: Budget | "All";
  duration: Duration | "All";
};

export const defaultFilters: IdeaFilters = {
  category: "All",
  budget: "All",
  duration: "All",
};

export function filterIdeas(filters: IdeaFilters): DateIdea[] {
  return dateIdeas.filter((entry) => {
    const categoryMatch = filters.category === "All" || entry.category === filters.category;
    const budgetMatch =
      filters.budget === "All" ||
      filters.budget === "Unlimited" ||
      budgetRank[entry.budget] <= budgetRank[filters.budget];
    const durationMatch = filters.duration === "All" || entry.duration === filters.duration;
    return categoryMatch && budgetMatch && durationMatch;
  });
}
