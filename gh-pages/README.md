# Part Builder
Interactive part number configurator for raw materials.

## Features

- Dynamic part number generation
- Real-time validation with exclusion rules
- Interactive table-based selection
- Responsive design

## Deployment

This site is automatically deployed to GitHub Pages on every commit to main.

### Local Development

1. Place your `attributes.json` file in the `gh-pages/` directory
2. Open `gh-pages/index.html` in a browser (use a local server to avoid CORS issues)

### GitHub Pages Setup

1. Push this repository to GitHub
2. Go to Settings → Pages
3. Source: GitHub Actions
4. The site will deploy automatically on every commit to main

## File Structure

```
gh-pages/
  ├── index.html      # Main HTML file
  ├── styles.css      # Stylesheet
  ├── app.js          # Application logic
  └── attributes.json # Data file (add your own)
```

## Usage

1. Visit the deployed site
2. Select Master Class from the first dropdown
3. Select Sub Class
4. Select Metallurgy
5. Continue selecting attributes in sequence
6. View the generated part number and description

## License

Copyright NONE
