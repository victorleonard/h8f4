export interface Song {
  title: string;
  artist: string;
  /** Durée en secondes (setlist). */
  durationSeconds?: number;
  /** Tempo en BPM (setlist). */
  tempo?: number;
}

export const songs: Song[] = [
  { title: 'Beautiful Things', artist: 'Benson Boone', durationSeconds: 180, tempo: 140 },
  { title: 'Beds Are Burning', artist: 'Midnight Oil', durationSeconds: 256, tempo: 128 },
  { title: 'Boys Don\'t Cry', artist: 'The Cure', durationSeconds: 155, tempo: 168 },
  { title: 'Bullet with Butterfly Wings', artist: 'The Smashing Pumpkins', durationSeconds: 258, tempo: 122 },
  { title: 'Come Out and Play', artist: 'The Offspring', durationSeconds: 198, tempo: 158 },
  { title: 'Dad Algorithm', artist: 'Shaka Ponk', durationSeconds: 210, tempo: 120 },
  { title: 'Digging the Grave', artist: 'Faith No More', durationSeconds: 183, tempo: 163 },
  { title: 'Dream On', artist: 'Aerosmith', durationSeconds: 266, tempo: 80 },
  { title: 'Emptiness Machine', artist: 'Linkin Park', durationSeconds: 190, tempo: 97 },
  { title: 'Fortunate Son', artist: 'Creedence Clearwater Revival', durationSeconds: 142, tempo: 132 },
  { title: 'Given Up', artist: 'Linkin Park', durationSeconds: 189, tempo: 100 },
  { title: 'Highway to Hell', artist: 'AC/DC', durationSeconds: 208, tempo: 116 },
  { title: 'Holiday', artist: 'Green Day', durationSeconds: 233, tempo: 147 },
  { title: 'House of the Rising Sun', artist: 'The Animals', durationSeconds: 250, tempo: 118 },
  { title: 'I Love Rock \'n Roll', artist: 'Joan Jett', durationSeconds: 175, tempo: 94 },
  { title: 'I Wanna Be Your Slave', artist: 'Måneskin', durationSeconds: 173, tempo: 133 },
  { title: 'Lonely Boy', artist: 'The Black Keys', durationSeconds: 193, tempo: 168 },
  { title: 'Paranoid', artist: 'Black Sabbath', durationSeconds: 167, tempo: 163 },
  { title: 'Runnin\' Wild', artist: 'Airbourne', durationSeconds: 222, tempo: 162 },
  { title: 'Seven Nation Army', artist: 'The White Stripes', durationSeconds: 233, tempo: 124 },
  { title: 'Small Print', artist: 'Muse', durationSeconds: 209, tempo: 148 },
  { title: 'Smells Like Teen Spirit', artist: 'Nirvana', durationSeconds: 301, tempo: 117 },
  { title: 'Song 2', artist: 'Blur', durationSeconds: 122, tempo: 130 },
  { title: 'Take Me Out', artist: 'Franz Ferdinand', durationSeconds: 237, tempo: 104 },
  { title: 'Temple Of Ekur', artist: 'Volbeat', durationSeconds: 259, tempo: 168 },
  { title: 'The Loneliest', artist: 'Måneskin', durationSeconds: 247, tempo: 130 },
  { title: 'Time Is Running Out', artist: 'Muse', durationSeconds: 238, tempo: 118 },
  { title: 'We Will Rock You', artist: 'Queen', durationSeconds: 122, tempo: 81 },
  { title: 'Where Is My Mind?', artist: 'Pixies', durationSeconds: 229, tempo: 81 },
  { title: 'Whole Lotta Love', artist: 'Led Zeppelin', durationSeconds: 334, tempo: 89 },
  { title: 'You Know My Name', artist: 'Chris Cornell', durationSeconds: 241, tempo: 138 },
  { title: 'Zombie', artist: 'The Cranberries', durationSeconds: 307, tempo: 84 },
];
