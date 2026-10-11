import assert from 'node:assert/strict';
import { createPosterSVG, effectivePpi } from '../public/renderer.js';

const rasterArt = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const albums = [
  {
    name: '1. Pink Floyd — The Dark Side of the Moon (10 tracks, standard)',
    data: {
      title: 'The Dark Side of the Moon',
      artist: 'Pink Floyd',
      date: 'March 1, 1973',
      duration: '42:50',
      label: 'Harvest / Capitol',
      tracks: ['Speak to Me','Breathe (In the Air)','On the Run','Time','The Great Gig in the Sky','Money','Us and Them','Any Colour You Like','Brain Damage','Eclipse'],
      artDataUrl: rasterArt, artWidth: 3000, artHeight: 3000, size: '18x24', theme: 'dark', fontFamily: 'sans', columns: '2'
    }
  },
  {
    name: '2. Pink Floyd — Wish You Were Here (5 tracks, Roman numerals)',
    data: {
      title: 'Wish You Were Here',
      artist: 'Pink Floyd',
      date: 'September 12, 1975',
      duration: '44:11',
      label: 'Harvest',
      tracks: ['Shine On You Crazy Diamond (Parts I–V)','Welcome to the Machine','Have a Cigar','Wish You Were Here','Shine On You Crazy Diamond (Parts VI–IX)'],
      artDataUrl: rasterArt, artWidth: 2400, artHeight: 2400, size: '18x24', theme: 'light', fontFamily: 'serif', columns: '1'
    }
  },
  {
    name: '3. Pink Floyd — Animals (5 tracks, short tracklist)',
    data: {
      title: 'Animals',
      artist: 'Pink Floyd',
      date: 'January 23, 1977',
      duration: '41:40',
      label: 'Harvest / EMI',
      tracks: ['Pigs on the Wing (Part 1)','Dogs','Pigs (Three Different Ones)','Sheep','Pigs on the Wing (Part 2)'],
      artDataUrl: rasterArt, artWidth: 2000, artHeight: 2000, size: '12x18', theme: 'dark', fontFamily: 'sans'
    }
  },
  {
    name: '4. The Beatles — Abbey Road (17 tracks, medley titles)',
    data: {
      title: 'Abbey Road',
      artist: 'The Beatles',
      date: 'September 26, 1969',
      duration: '47:23',
      label: 'Apple Records',
      tracks: ['Come Together','Something',"Maxwell's Silver Hammer",'Oh! Darling',"Octopus's Garden",'I Want You (She\'s So Heavy)','Here Comes the Sun','Because','You Never Give Me Your Money','Sun King','Mean Mr. Mustard','Polythene Pam','She Came In Through the Bathroom Window','Golden Slumbers','Carry That Weight','The End','Her Majesty'],
      artDataUrl: rasterArt, artWidth: 3200, artHeight: 3200, size: '18x24', theme: 'light'
    }
  },
  {
    name: '5. The Beatles — The Beatles (White Album) (30 tracks, double album)',
    data: {
      title: 'The Beatles (White Album)',
      artist: 'The Beatles',
      date: 'November 22, 1968',
      duration: '1:33:33',
      label: 'Apple Records',
      tracks: [
        'Back in the U.S.S.R.','Dear Prudence','Glass Onion','Ob-La-Di, Ob-La-Da','Wild Honey Pie','The Continuing Story of Bungalow Bill','While My Guitar Gently Weeps','Happiness Is a Warm Gun',
        'Martha My Dear',"I'm So Tired",'Blackbird','Piggies','Rocky Raccoon',"Don't Pass Me By",'Why Don\'t We Do It in the Road?','I Will','Julia',
        'Birthday','Yer Blues',"Mother Nature's Son",'Everybody\'s Got Something to Hide Except Me and My Monkey','Sexy Sadie','Helter Skelter','Long, Long, Long',
        'Revolution 1','Honey Pie','Savoy Truffle','Cry Baby Cry','Revolution 9','Good Night'
      ],
      artDataUrl: rasterArt, artWidth: 2800, artHeight: 2800, size: '18x24', columns: '2'
    }
  },
  {
    name: '6. Fleetwood Mac — Rumours (11 tracks, light theme)',
    data: {
      title: 'Rumours',
      artist: 'Fleetwood Mac',
      date: 'February 4, 1977',
      duration: '39:43',
      label: 'Warner Bros. Records',
      tracks: ['Second Hand News','Dreams','Never Going Back Again',"Don't Stop",'Go Your Own Way','Songbird','The Chain','You Make Loving Fun',"I Don't Want to Know",'Oh Daddy','Gold Dust Woman'],
      artDataUrl: rasterArt, artWidth: 2000, artHeight: 2000, size: '18x24', theme: 'light', fontFamily: 'serif'
    }
  },
  {
    name: '7. Daft Punk — Discovery (14 tracks, electronic)',
    data: {
      title: 'Discovery',
      artist: 'Daft Punk',
      date: 'March 12, 2001',
      duration: '1:00:50',
      label: 'Virgin Records',
      tracks: ['One More Time','Aerodynamic','Digital Love','Harder, Better, Faster, Stronger','Crescendolls','Nightvision','Superheroes','High Life','Something About Us','Voyager','Veridis Quo','Short Circuit','Face to Face','Too Long'],
      artDataUrl: rasterArt, artWidth: 2500, artHeight: 2500, size: '18x24', theme: 'dark', fontFamily: 'sans'
    }
  },
  {
    name: '8. Miles Davis — Kind of Blue (5 tracks, modal jazz)',
    data: {
      title: 'Kind of Blue',
      artist: 'Miles Davis',
      date: 'August 17, 1959',
      duration: '45:37',
      label: 'Columbia Records',
      tracks: ['So What','Freddie Freeloader','Blue in Green','All Blues','Flamenco Sketches'],
      artDataUrl: rasterArt, artWidth: 3000, artHeight: 3000, size: '18x24', theme: 'dark', fontFamily: 'serif', columns: '1'
    }
  },
  {
    name: '9. John Coltrane — A Love Supreme (4 tracks, spiritual suite)',
    data: {
      title: 'A Love Supreme',
      artist: 'John Coltrane',
      date: 'January 1965',
      duration: '33:02',
      label: 'Impulse!',
      tracks: ['Part I – Acknowledgement','Part II – Resolution','Part III – Pursuance','Part IV – Psalm'],
      artDataUrl: rasterArt, artWidth: 2400, artHeight: 2400, size: '12x12', theme: 'dark', fontFamily: 'serif'
    }
  },
  {
    name: '10. Radiohead — OK Computer (12 tracks, 90s alt rock)',
    data: {
      title: 'OK Computer',
      artist: 'Radiohead',
      date: 'May 21, 1997',
      duration: '53:21',
      label: 'Parlophone / Capitol',
      tracks: ['Airbag','Paranoid Android','Subterranean Homesick Alien','Exit Music (For a Film)','Let Down','Karma Police','Fitter Happier','Electioneering','Climbing Up the Walls','No Surprises','Lucky','The Tourist'],
      artDataUrl: rasterArt, artWidth: 2200, artHeight: 2200, size: '18x24', fontFamily: 'mono', theme: 'light'
    }
  },
  {
    name: '11. Radiohead — Kid A (10 tracks, electronic experimental)',
    data: {
      title: 'Kid A',
      artist: 'Radiohead',
      date: 'October 2, 2000',
      duration: '49:57',
      label: 'Parlophone',
      tracks: ['Everything in Its Right Place','Kid A','The National Anthem','How to Disappear Completely','Treefingers','Optimistic','In Limbo','Idioteque','Morning Bell','Motion Picture Soundtrack'],
      artDataUrl: rasterArt, artWidth: 2000, artHeight: 2000, size: '18x24', theme: 'dark'
    }
  },
  {
    name: '12. Kendrick Lamar — good kid, m.A.A.d city (12 tracks, hip-hop)',
    data: {
      title: 'good kid, m.A.A.d city',
      artist: 'Kendrick Lamar',
      date: 'October 22, 2012',
      duration: '1:08:23',
      label: 'Top Dawg / Aftermath / Interscope',
      tracks: ['Sherane a.k.a Master Splinter’s Daughter','Bitch, Don’t Kill My Vibe','Backseat Freestyle','The Art of Peer Pressure','Money Trees','Poetic Justice','good kid','m.A.A.d city','Swimming Pools (Drank)','Sing About Me, I\'m Dying of Thirst','Real','Compton'],
      artDataUrl: rasterArt, artWidth: 2500, artHeight: 2500, size: '18x24', theme: 'dark'
    }
  },
  {
    name: '13. Kendrick Lamar — To Pimp a Butterfly (16 tracks, lengthy titles)',
    data: {
      title: 'To Pimp a Butterfly',
      artist: 'Kendrick Lamar',
      date: 'March 15, 2015',
      duration: '1:18:51',
      label: 'Top Dawg / Aftermath / Interscope',
      tracks: ['Wesley\'s Theory','For Free? (Interlude)','King Kunta','Institutionalized','These Walls','u','Alright','For Sale? (Interlude)','Momma','Hood Politics','How Much a Dollar Cost','Complexion (A Zulu Love)','The Blacker the Berry','You Ain\'t Gotta Lie (Momma Said)','i','Mortal Man'],
      artDataUrl: rasterArt, artWidth: 2500, artHeight: 2500, size: '18x24', theme: 'dark'
    }
  },
  {
    name: '14. Michael Jackson — Thriller (9 tracks, 80s pop)',
    data: {
      title: 'Thriller',
      artist: 'Michael Jackson',
      date: 'November 30, 1982',
      duration: '42:19',
      label: 'Epic Records',
      tracks: ['Wanna Be Startin\' Somethin\'','Baby Be Mine','The Girl Is Mine','Thriller','Beat It','Billie Jean','Human Nature','P.Y.T. (Pretty Young Thing)','The Lady in My Life'],
      artDataUrl: rasterArt, artWidth: 2200, artHeight: 2200, size: '18x24', theme: 'dark'
    }
  },
  {
    name: '15. Prince — Purple Rain (9 tracks, soundtrack)',
    data: {
      title: 'Purple Rain',
      artist: 'Prince and The Revolution',
      date: 'June 25, 1984',
      duration: '43:51',
      label: 'Warner Bros. Records',
      tracks: ['Let\'s Go Crazy','Take Me with U','The Beautiful Ones','Computer Blue','Darling Nikki','When Doves Cry','I Would Die 4 U','Baby I\'m a Star','Purple Rain'],
      artDataUrl: rasterArt, artWidth: 2400, artHeight: 2400, size: '18x24', theme: 'dark'
    }
  },
  {
    name: '16. The Smashing Pumpkins — Mellon Collie and the Infinite Sadness (28 tracks)',
    data: {
      title: 'Mellon Collie and the Infinite Sadness',
      artist: 'The Smashing Pumpkins',
      date: 'October 24, 1995',
      duration: '2:01:28',
      label: 'Virgin Records',
      tracks: [
        'Mellon Collie and the Infinite Sadness','Tonight, Tonight','Jellybelly','Zero','Here Is No Why','Bullet with Butterfly Wings','To Forgive','An Ode to No One','Love','Cupid de Locke','Galapogos','Muzzle','Porcelina of the Vast Oceans','Take Me Down',
        'Where Boys Fear to Tread','Bodies','Thirty-Three','In the Arms of Sleep','1979','Tales of a Scorched Earth','Thru the Eyes of Ruby','Stumbleine','X.Y.U.','We Only Come Out at Night','Beautiful','Lily (My One and Only)','By Starlight','Farewell and Goodnight'
      ],
      artDataUrl: rasterArt, artWidth: 2600, artHeight: 2600, size: '18x24', columns: '2'
    }
  },
  {
    name: '17. The Magnetic Fields — 69 Love Songs (60 tracks maximum boundary)',
    data: {
      title: '69 Love Songs (Anthology Edition)',
      artist: 'The Magnetic Fields',
      date: 'September 7, 1999',
      duration: '2:52:16',
      label: 'Merge Records',
      tracks: Array.from({ length: 60 }, (_, i) => `Love Song #${i + 1} - Acoustic Movement`),
      artDataUrl: rasterArt, artWidth: 3200, artHeight: 3200, size: '24x36', columns: '3'
    }
  },
  {
    name: '18. Sufjan Stevens — Illinois (22 tracks, extremely long literary subtitles)',
    data: {
      title: 'Illinois',
      artist: 'Sufjan Stevens',
      date: 'July 4, 2005',
      duration: '1:14:09',
      label: 'Asthmatic Kitty',
      tracks: [
        'Concerning the UFO Sighting Near Highland, Illinois',
        'The Black Hawk War, or, How to Demolish an Entire Civilization and Still Feel Good About Yourself in the Morning, or, We Apologize for the Inconvenience but We\'re Already Packing',
        'Come On! Feel the Illinoise! (Part I: The World\'s Columbian Exposition / Part II: Carl Sandburg Visits Me in a Dream)',
        'John Wayne Gacy, Jr.',
        'Jacksonville',
        'A Gallant Gentleman Keeps the Night Watch',
        'Decatur, or, Round of a Thousand Pound',
        'One Last "Whoo-Hoo!" for the Pullman Workers',
        'Chicago',
        'Casimir Pulaski Day',
        'To the Workers of the Rock River Valley Ready to Build the Car',
        'The Man of Metropolis Steals Our Hearts',
        'Prairie Fire That Wanders About',
        'A Conjunction of Drones Simulating the Way in Which Sufjan Stevens Has Trouble Sleeping at Night',
        'The Predatory Wasp of the Palisades Is Out to Get Us!',
        'They Are Night Zombies!! They Are Neighbors!! They Have Come Back from the Dead!! Ahhhh!',
        'Let\'s Hear That String Part Again',
        'In This Temple as in the Hearts of Man for Whom He Saved the Earth',
        'The Seer\'s Tower',
        'The Tallest Man, the Broadest Shoulders (Part I: The Great Frontier / Part II: Come to Me Only with Playtoys Now)',
        'Riffs and Variations on a Single Note for Jelly Roll, Earl Hines, Louis Armstrong, Baby Dodds, and the King of Swing, to Name a Few',
        'Out of Egypt, into the Great Laugh of Mankind, and I Shake the Dirt from My Sandals as I Run'
      ],
      artDataUrl: rasterArt, artWidth: 2400, artHeight: 2400, size: '18x24', columns: '2'
    }
  },
  {
    name: '19. Fiona Apple — When the Pawn... (Longest album title)',
    data: {
      title: 'When the Pawn Hits the Conflicts He Thinks like a King What He Knows Throws the Blows When He Goes to the Fight and He\'ll Win the Whole Thing \'Fore He Hits the Ground \'Cause He Is What He Is and He Has What He Has and Nobody Can Take That Away from Him',
      artist: 'Fiona Apple',
      date: 'November 9, 1999',
      duration: '42:37',
      label: 'Clean Slate / Epic',
      tracks: ['On the Bound','To Your Love','Limp','Love Ridden','Paper Bag','A Mistake','Fast as You Can','The Way Things Are','Get Gone','I Know'],
      artDataUrl: rasterArt, artWidth: 2200, artHeight: 2200, size: '18x24'
    }
  },
  {
    name: '20. Godspeed You! Black Emperor — Lift Your Skinny Fists... (Post-rock)',
    data: {
      title: 'Lift Your Skinny Fists Like Antennas to Heaven',
      artist: 'Godspeed You! Black Emperor',
      date: 'October 9, 2000',
      duration: '1:27:21',
      label: 'Constellation',
      tracks: [
        'Storm: Lift Yr. Skinny Fists, Like Antennas to Heaven... / Gathering Storm / Il Pleut à Mourir (+Clatters Like Worry) / "Welcome to Arco AM/PM..."',
        'Static: Terrible Canyons of Static / Atomic Clock / Chart #3 / World Police and Friendly Fire / [+The Buildings They Are On Fire]',
        'Sleep: Murray Ostril: "...They Don\'t Sleep Anymore on the Beach" / Monheim / Broken Windows, Locks of Love Pt. III / 3rd Part',
        'Like Antennas to Heaven...: Moya Sings "Baby-O" / Edgyswag / G-Lock / She Dreamt She Was a Bulldozer, She Dreamt She Was Alone in an Empty Field'
      ],
      artDataUrl: rasterArt, artWidth: 2400, artHeight: 2400, size: '18x24', columns: '1', fontFamily: 'mono'
    }
  },
  {
    name: '21. Hikaru Utada — First Love (Japanese Kanji & Kana)',
    data: {
      title: 'First Love (初恋)',
      artist: '宇多田ヒカル (Hikaru Utada)',
      date: '1999年3月10日',
      duration: '54:17',
      label: 'Toshiba EMI',
      tracks: ['Automatic','Movin\' on without you','In My Room','First Love','甘いワナ ～Paint It, Black','time will tell','Never Let Go','B&C','Another Chance','Interlude','Give Me A Reason'],
      artDataUrl: rasterArt, artWidth: 2000, artHeight: 2000, size: '18x24'
    }
  },
  {
    name: '22. Joe Hisaishi — Spirited Away Soundtrack (Japanese)',
    data: {
      title: '千と千尋の神隠し サウンドトラック',
      artist: '久石譲 (Joe Hisaishi) & 新日本フィルハーモニー交響楽団',
      date: '2001-07-18',
      duration: '1:00:23',
      label: '徳間ジャパンコミュニケーションズ',
      tracks: ['あの夏へ (One Summer\'s Day)','とおり道 (A Road to Somewhere)','誰もいない料理店 (The Empty Restaurant)','夜来る (Nighttime Coming)','竜の少年 (The Dragon Boy)','ボイラー虫 (Sootballs)','神さま達 (Procession of the Spirits)','湯婆婆 (Yubaba)','湯屋の朝 (Morning at the Bathhouse)','あの日の川 (The Day of the River)','ふたたび (Reprise)','いつも何度でも (Always with Me)'],
      artDataUrl: rasterArt, artWidth: 2000, artHeight: 2000, size: '18x24', fontFamily: 'serif'
    }
  },
  {
    name: '23. BTS — Map of the Soul: 7 (Korean Hangul & English, 20 tracks)',
    data: {
      title: 'MAP OF THE SOUL : 7',
      artist: '방탄소년단 (BTS)',
      date: '2020-02-21',
      duration: '1:14:11',
      label: 'Big Hit Entertainment',
      tracks: ['Intro : Persona','작은 것들을 위한 시 (Boy With Luv)','Make It Right','Jamais Vu','Dionysus','Interlude : Shadow','Black Swan','시차 (My Time)','Filter','시차 (My Time)','Louder than bombs','ON','욱 (UGH!)','00:00 (Zero O\'Clock)','Inner Child','친구 (Friends)','Moon','Respect','We are Bulletproof : the Eternal','Outro : Ego'],
      artDataUrl: rasterArt, artWidth: 2400, artHeight: 2400, size: '18x24'
    }
  },
  {
    name: '24. Kino — Gruppa Krovi (Cyrillic Russian)',
    data: {
      title: 'Группа крови (Blood Type)',
      artist: 'Кино (Виктор Цой)',
      date: '1988',
      duration: '47:20',
      label: 'Russian Disc / Moroz Records',
      tracks: ['Группа крови','Война','Спокойная ночь','Мама, мы все тяжело больны','Бошетунмай','В наших глазах','Попробуй спеть вместе со мной','Прохожий','Дальше действовать будем мы','Легенда'],
      artDataUrl: rasterArt, artWidth: 2000, artHeight: 2000, size: '18x24', fontFamily: 'mono', theme: 'dark'
    }
  },
  {
    name: '25. Sigur Rós — Ágætis byrjun (Icelandic accents)',
    data: {
      title: 'Ágætis byrjun',
      artist: 'Sigur Rós',
      date: '12. júní 1999',
      duration: '1:11:41',
      label: 'Smekkleysa / FatCat Records',
      tracks: ['Intro','Svefn-g-englar','Starálfur','Flugufrelsarinn','Ný batterí','Hjartað hamast (bamm bamm bamm)','Viðrar vel til loftárása','Olsen Olsen','Ágætis byrjun','Avalon'],
      artDataUrl: rasterArt, artWidth: 2400, artHeight: 2400, size: '18x24', fontFamily: 'serif'
    }
  },
  {
    name: '26. Motörhead — Ace of Spades (Heavy metal umlauts & punctuation)',
    data: {
      title: 'Ace of Spades',
      artist: 'Motörhead',
      date: 'November 8, 1980',
      duration: '36:11',
      label: 'Bronze Records',
      tracks: ['Ace of Spades','Love Me Like a Reptile','Shoot You in the Back','Live to Win','Fast and Loose','(We Are) The Road Crew','Fire, Fire','Jailbait','Dance','Bite the Bullet','The Chase Is Better Than the Catch','The Hammer'],
      artDataUrl: rasterArt, artWidth: 2000, artHeight: 2000, size: '18x24', theme: 'dark'
    }
  },
  {
    name: '27. Brian Eno — Ambient 1: Music for Airports (Minimal numeric titles)',
    data: {
      title: 'Ambient 1: Music for Airports',
      artist: 'Brian Eno',
      date: 'March 1978',
      duration: '48:32',
      label: 'Polydor / EG Records',
      tracks: ['1/1','1/2','2/1','2/2'],
      artDataUrl: rasterArt, artWidth: 1800, artHeight: 1800, size: '12x12', columns: '1', fontFamily: 'sans'
    }
  },
  {
    name: '28. Tortoise — Djed (1 single long track)',
    data: {
      title: 'Millions Now Living Will Never Die - Djed EP',
      artist: 'Tortoise',
      date: 'January 30, 1996',
      duration: '20:53',
      label: 'Thrill Jockey',
      tracks: ['Djed'],
      artDataUrl: rasterArt, artWidth: 1500, artHeight: 1500, size: '12x18', columns: '1', fontFamily: 'mono'
    }
  },
  {
    name: '29. Ambient Sound Art (0 tracks, artwork only)',
    data: {
      title: 'Pure Resonance in Empty Space',
      artist: 'Anonymous Sound Installation',
      date: '2026',
      duration: '',
      label: 'Independent Archive',
      tracks: [],
      artDataUrl: rasterArt, artWidth: 2000, artHeight: 2000, size: '18x24'
    }
  },
  {
    name: '30. Deluxe Box Set (60 tracks, 3 columns, 24x36 poster)',
    data: {
      title: 'The Complete Works & Sessions (Deluxe 60-Track Edition)',
      artist: 'The Grand Philharmonic & Special Guests',
      date: '2026',
      duration: '3:45:12',
      label: 'Archival Recordings International',
      tracks: Array.from({ length: 60 }, (_, i) => `Symphonic Movement No. ${i + 1} - Allegro Con Brio`),
      artDataUrl: rasterArt, artWidth: 4000, artHeight: 4000, size: '24x36', columns: '3', fontFamily: 'serif'
    }
  }
];

let passed = 0;
let failed = 0;

for (const album of albums) {
  try {
    const svg = createPosterSVG(album.data);
    assert.ok(svg.startsWith('<svg'), 'Should produce valid SVG');
    assert.ok(svg.endsWith('</svg>'), 'Should terminate SVG cleanly');
    const ppi = effectivePpi(album.data);
    assert.ok(ppi > 0 || album.data.tracks.length === 0, 'Effective PPI should be calculated');
    passed++;
    console.log(`[PASS] ${album.name}`);
  } catch (err) {
    failed++;
    console.error(`[FAIL] ${album.name}: ${err.message}`);
  }
}

console.log(`\n========================================`);
console.log(`Stress Test Summary: ${passed} passed, ${failed} failed out of ${albums.length} albums`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
