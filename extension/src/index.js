import allSidesNewsRatings from './allSidesNewsRatings.json';
import mediaBiasFactCheckRatings from './mediaBiasFactCheckRatings.json';
import adFontesMediaReliabilityRatings from './adFontesMediaReliabilityRatings.json';

async function getTopicsFromBackend(title, firstParagraph) {
    try {
      const response = await fetch('https://mediabias-6z9ggwegx-bob-matadors-projects.vercel.app', { // Update with your Vercel app URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, firstParagraph })
      });
  
      const data = await response.json();
      console.log('Backend API Response:', data);
      return data.topics || 'No topics found';
    } catch (error) {
      console.error('Backend API Error:', error);
      return 'Error fetching topics';
    }
  }
  
  

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOMContentLoaded');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    console.log('Tabs queried:', tabs);

    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: getArticleInfo,
      },
      async (results) => {
        console.log('Script executed, results:', results);

        if (results && results[0] && results[0].result) {
          const result = results[0].result;
          console.log('Article Info:', result);

          document.getElementById('publisher').innerText = result.publisher || 'Not found';
          document.getElementById('title').innerText = result.title || 'Not found';
          document.getElementById('topic').innerText = 'Detecting...';

          // Get topics from the backend API
          const topics = await getTopicsFromBackend(result.title, result.firstParagraph);
          document.getElementById('topic').innerText = topics;

          // Display reliability and bias
          const reliability = getReliability(result.publisher);
          const bias = getBias(result.publisher);

          document.getElementById('reliability').innerText = reliability;
          document.getElementById('bias').innerText = bias;
        } else {
          console.error('Error fetching article info from page.');
        }
      }
    );
  });
});

function getArticleInfo() {
  let title = '';
  let publisher = '';
  let firstParagraph = '';

  // Attempt to extract title from meta tags
  const metaTags = document.getElementsByTagName('meta');
  for (let meta of metaTags) {
    if (meta.getAttribute('property') === 'og:title' || meta.getAttribute('name') === 'title') {
      title = meta.getAttribute('content');
    }
    if (meta.getAttribute('property') === 'og:site_name' || meta.getAttribute('name') === 'publisher' || meta.getAttribute('name') === 'og:site_name') {
      publisher = meta.getAttribute('content');
    }
  }

  // Fallback to document title if title is not found
  if (!title) {
    title = document.title;
  }

  // Fallback to hostname if publisher is not found
  if (!publisher) {
    publisher = window.location.hostname;
  }

  // Extract first paragraph for API call
  const paragraphs = document.getElementsByTagName('p');
  if (paragraphs.length > 0) {
    firstParagraph = paragraphs[0].innerText;
  }

  return { title, publisher, firstParagraph };
}

function getReliability(source) {
  const matchingSource = Object.keys(adFontesMediaReliabilityRatings).find(key =>
    source.toLowerCase().includes(key.toLowerCase())
  );
  return matchingSource ? adFontesMediaReliabilityRatings[matchingSource] : 'N/A';
}

function getBias(source) {
  const biasMap = {
    'right': 2,
    'right-center': 1,
    'center': 0,
    'left-center': -1,
    'left': -2
  };

  const allSidesSource = Object.keys(allSidesNewsRatings).find(key =>
    source.toLowerCase().includes(key.toLowerCase())
  );
  const mediaBiasSource = Object.keys(mediaBiasFactCheckRatings).find(key =>
    source.toLowerCase().includes(key.toLowerCase())
  );

  const allSidesBias = allSidesSource ? biasMap[allSidesNewsRatings[allSidesSource]] : null;
  const mediaBiasBias = mediaBiasSource ? biasMap[mediaBiasFactCheckRatings[mediaBiasSource]] : null;

  if (allSidesBias !== null && mediaBiasBias !== null) {
    return ((allSidesBias + mediaBiasBias) / 2).toFixed(1);
  } else if (allSidesBias !== null) {
    return allSidesBias.toFixed(1);
  } else if (mediaBiasBias !== null) {
    return mediaBiasBias.toFixed(1);
  } else {
    return 'N/A';
  }
}
