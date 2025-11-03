# Breathe with Me

A calming breathing exercise web application with visual guidance, customizable patterns, and audio cues.

## Features

- **Multiple Breathing Patterns**: Choose from Box (4-4-4-4), Relaxing (4-7-8), Energizing (4-4-6), or create your own custom pattern
- **Visual Guidance**: Animated breathing circle with smooth transitions and soft glowing effects
- **Audio Cues**: Gentle ping sounds to guide breathing transitions (three frequency options)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Beautiful UI**: Starry night theme with gradient effects and smooth animations

## Project Structure

```
Breathing Exercise/
├── index.html          # Main HTML file
├── css/
│   └── styles.css     # All styling and animations
├── js/
│   └── app.js         # Application logic and audio handling
├── files/
│   └── breathe-with-me.html  # Original single-file version
└── README.md          # This file
```

## Usage

Simply open `index.html` in a modern web browser. No build process or dependencies required!

### Controls

1. **Breathing Pattern**: Select from preset patterns or create a custom one
2. **Audio Settings**: Toggle the transition ping sound and choose frequency (Low/Medium/High)
3. **Start/Stop**: Begin the breathing exercise or stop at any time

### Breathing Patterns

- **Box Breathing (4-4-4-4)**: Breathe in for 4s, hold for 4s, breathe out for 4s, hold for 4s
- **Relaxing (4-7-8)**: Breathe in for 4s, hold for 7s, breathe out for 8s
- **Energizing (4-4-6)**: Breathe in for 4s, hold for 4s, breathe out for 6s
- **Custom**: Set your own duration for each phase (2-10 seconds)

## Technical Details

- Pure vanilla JavaScript (no frameworks)
- CSS3 animations and transitions
- Web Audio API for sound generation
- Responsive design with CSS Grid and Flexbox
- Mobile-optimized with touch-friendly controls

## Browser Support

Works on all modern browsers that support:
- ES6 JavaScript
- CSS Grid and Flexbox
- Web Audio API
- CSS animations and transitions

## License

Free to use for personal and educational purposes.
