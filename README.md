# AlloPropreté - Site Vitrine

Site vitrine pour AlloPropreté, entreprise de nettoyage professionnel en Île-de-France.

## Structure du projet

```
alloproprete/
├── index.html                    # Page d'accueil
├── sitemap.xml                   # Sitemap pour SEO
├── robots.txt                    # Instructions pour les robots
├── css/
│   ├── variables.css             # Design tokens (couleurs, typo, espacements)
│   ├── reset.css                 # Reset CSS moderne
│   ├── base.css                  # Styles de base et typographie
│   ├── layout.css                # Grilles et mise en page
│   ├── components.css            # Composants réutilisables
│   └── pages.css                 # Styles spécifiques aux pages
├── js/
│   └── main.js                   # Navigation, formulaire, tracking
└── pages/
    ├── devis-nettoyage.html      # Formulaire de devis
    ├── qui-sommes-nous.html      # Page À propos
    ├── contact.html              # Page Contact
    ├── mentions-legales.html     # Mentions légales
    ├── politique-de-confidentialite.html
    ├── nettoyage-paris.html      # Hub ville Paris
    ├── nettoyage-val-doise-95.html
    ├── nettoyage-essonne-91.html
    ├── nettoyage-seine-et-marne-77.html
    ├── nettoyage-fin-de-chantier/
    │   ├── index.html            # Page pilier
    │   ├── paris.html            # Pages locales
    │   ├── val-doise-95.html
    │   ├── essonne-91.html
    │   └── seine-et-marne-77.html
    ├── nettoyage-avant-etat-des-lieux/
    ├── entretien-bureaux/
    ├── nettoyage-copropriete/
    ├── nettoyage-locaux-commerciaux/
    ├── nettoyage-industriel/
    ├── nettoyage-vitres/
    └── remise-en-etat/
```

## Fonctionnalités

- **42 pages** optimisées SEO
- **Schema.org** : LocalBusiness, Service, BreadcrumbList, FAQPage
- **Tracking GTM-ready** : dataLayer configuré pour Google Tag Manager
- **Responsive** : Mobile-first, testé sur tous les breakpoints
- **Accessibilité** : Skip links, focus visible, contrastes WCAG AA
- **Performance** : CSS vanilla, pas de framework, fonts optimisées

## Tracking

Le site est prêt pour l'intégration de Google Tag Manager. Les événements suivants sont trackés :

- `page_view` : Vue de page
- `form_start` : Début de remplissage du formulaire
- `form_submit` / `conversion_form_submit` : Soumission du formulaire
- `cta_click` : Clic sur un CTA
- `scroll_depth` : Profondeur de scroll (25%, 50%, 75%, 100%)
- `faq_interaction` : Ouverture/fermeture d'une FAQ

## Déploiement

Compatible avec :
- GitHub Pages
- Netlify
- Vercel
- Tout hébergement statique

## Stack technique

- HTML5 sémantique
- CSS vanilla (variables CSS, pas de framework)
- JavaScript vanilla (ES6+)
- Aucune dépendance externe

## Couleurs

| Rôle | Couleur |
|------|---------|
| Primaire | `#1a365d` (bleu profond) |
| Secondaire | `#059669` (vert émeraude) |
| Accent CTA | `#ea580c` (orange) |
| Fond | `#fafaf9` (blanc cassé) |
| Texte | `#1c1917` (gris anthracite) |

## Typographie

- **Titres** : DM Serif Display
- **Corps** : Outfit

---

Créé avec le skill website-creator.
