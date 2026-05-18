# MovieReview App Architecture

## Project Structure
- `index.html` - The main entry point and skeleton for the Single Page Application (SPA).
- `src/`
    - `data/`
        - `movies.js` - Mock data containing the array of movie objects.
    - `styles/`
        - `main.css` - Global styles, Tailwind directives, and dark mode theme.
    - `scripts/`
        - `app.js` - Core logic for rendering, search filtering, and navigation between views.
        - `components.js` - Reusable UI components (Movie Card, Review Form, etc.).
    - `assets/`
        - `images/` - Local images and icons.

## Technology Stack
- **HTML5 & CSS3**: Semantic structure and custom styling.
- **Tailwind CSS**: For rapid, modern, and responsive UI development.
- **Vanilla JavaScript (ES6+)**: To manage state, DOM manipulation, and logic without external framework overhead.
