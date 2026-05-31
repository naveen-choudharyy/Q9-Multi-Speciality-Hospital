import { useEffect } from 'react';

export default function useSEO({ title, description }) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | Q9 Multi-Specialty Hospital`;
    } else {
      document.title = 'Q9 Multi-Specialty Hospital';
    }

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    
    if (description) {
      metaDesc.setAttribute('content', description);
    } else {
      metaDesc.setAttribute(
        'content',
        'Welcome to Q9 Multi-Specialty Hospital. Experience expert clinical care, modern pediatric wards, advanced disease predictors, and smart appointments booking.'
      );
    }
  }, [title, description]);
}
