import { useState } from 'react';
import type { Product } from '../services/api';

const accents = ['#bb4d31', '#657c69', '#c08c42', '#77729a'];

export function ProductVisual({ product }: { product: Product }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (product.imageUrl && !imageFailed) {
    return (
      <img
        className="product-photo"
        src={product.imageUrl}
        alt={`${product.name} product image`}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  const slug = product.category.slug;
  const seed = [...product.slug].reduce((total, character) => total + character.charCodeAt(0), 0);
  const accent = accents[seed % accents.length];
  const gradient = `screen-${product.slug.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg
      className={`product-illustration illustration-${slug}`}
      viewBox="0 0 220 220"
      role="img"
      aria-label={`${product.category.name} illustration for fictional demo product ${product.name}`}
    >
      <defs>
        <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#d8d3c8" />
          <stop offset="1" stopColor="#f5f2eb" />
        </linearGradient>
      </defs>
      {slug === 'smartphones' && (
        <g>
          <ellipse cx="112" cy="196" rx="49" ry="8" fill="#292824" opacity=".15" />
          <rect x="66" y="15" width="91" height="185" rx="20" fill="#343530" />
          <rect x="71" y="21" width="81" height="173" rx="16" fill={`url(#${gradient})`} />
          <rect x="96" y="26" width="28" height="5" rx="3" fill="#343530" />
          <path d="M75 116c21-44 51-62 73-49v57c-28 28-53 32-73 13z" fill={accent} opacity=".9" />
          <circle cx="104" cy="116" r="22" fill="#f6f4ef" opacity=".8" />
          <circle cx="104" cy="116" r="8" fill={accent} />
          <path d="M79 163c18-11 41-14 68-7v24H79z" fill="#657c69" opacity=".82" />
          <circle cx="111" cy="185" r="2.5" fill="#77746d" />
        </g>
      )}
      {slug === 'laptops' && (
        <g>
          <ellipse cx="111" cy="173" rx="91" ry="9" fill="#292824" opacity=".15" />
          <rect x="31" y="34" width="158" height="116" rx="8" fill="#343530" />
          <rect x="38" y="41" width="144" height="101" rx="3" fill={`url(#${gradient})`} />
          <path d="M39 115c26-38 47-45 68-28 21 18 42 19 75-14v68H39z" fill={accent} opacity=".9" />
          <circle cx="148" cy="69" r="19" fill="#e8c98f" opacity=".9" />
          <path d="M17 151h186l13 20c2 3-1 6-6 6H14c-5 0-8-3-6-6z" fill="#b9b5ac" />
          <path d="M87 152h45l8 9H80z" fill="#8c887f" />
          <path d="M29 170h161" stroke="#d6d2c8" strokeWidth="2" />
        </g>
      )}
      {slug === 'headphones' && (
        <g>
          <ellipse cx="110" cy="188" rx="69" ry="9" fill="#292824" opacity=".15" />
          <path
            d="M57 126v-22c0-34 23-59 53-59s53 25 53 59v22"
            fill="none"
            stroke="#343530"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path d="M64 113v12M156 113v12" stroke={accent} strokeWidth="7" strokeLinecap="round" />
          <rect x="43" y="105" width="42" height="74" rx="19" fill="#474842" />
          <rect x="135" y="105" width="42" height="74" rx="19" fill="#474842" />
          <rect x="49" y="112" width="29" height="60" rx="14" fill={accent} />
          <rect x="142" y="112" width="29" height="60" rx="14" fill={accent} />
          <path d="M57 122v34M149 122v34" stroke="#f0ece3" strokeWidth="2" opacity=".6" />
        </g>
      )}
      {slug === 'smartwatches' && (
        <g>
          <ellipse cx="110" cy="192" rx="49" ry="8" fill="#292824" opacity=".15" />
          <path
            d="M82 21c0-5 4-9 9-9h38c5 0 9 4 9 9l5 44H77zM77 155h66l-5 44c0 5-4 9-9 9H91c-5 0-9-4-9-9z"
            fill="#77746d"
          />
          <rect x="64" y="58" width="92" height="105" rx="25" fill="#343530" />
          <rect x="71" y="65" width="78" height="91" rx="20" fill={`url(#${gradient})`} />
          <circle cx="110" cy="104" r="22" fill="none" stroke={accent} strokeWidth="5" />
          <path
            d="M110 86v19l13 8"
            fill="none"
            stroke="#343530"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="110" cy="104" r="3" fill="#343530" />
          <rect x="151" y="99" width="6" height="24" rx="3" fill="#343530" />
          <path d="M91 27h38M91 191h38" stroke="#b7b2a7" strokeWidth="2" />
        </g>
      )}
      {!['smartphones', 'laptops', 'headphones', 'smartwatches'].includes(slug) && (
        <g>
          <ellipse cx="110" cy="181" rx="57" ry="9" fill="#292824" opacity=".15" />
          <rect x="67" y="34" width="86" height="141" rx="22" fill="#343530" />
          <rect x="74" y="42" width="72" height="126" rx="16" fill={`url(#${gradient})`} />
          <circle cx="110" cy="101" r="23" fill={accent} />
        </g>
      )}
    </svg>
  );
}
