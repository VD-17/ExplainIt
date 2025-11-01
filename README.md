# ExplainIt.AI – Chrome AI Teacher Extension

**ExplainIt.AI** is a Chrome extension that acts as your personal AI Teacher. It helps users understand complex web content by simplifying text, summarizing key points, translating into multiple languages, and generating interactive flashcards—all using **Chrome’s built-in AI APIs**. It runs fully **client-side**, ensuring privacy, offline capability, and fast performance.

## Features
- Simplify complex text into clear, accessible explanations.
- Summarize long paragraphs or articles into key points.
- Translate content into multiple languages.
- Generate interactive flashcards or quizzes for active learning.
- Read aloud explanations using audio narration.
- Works offline and preserves user privacy.

## Built With
- **Languages:** JavaScript, HTML, CSS
- **Libraries:** tesseract.js (OCR)
- **Platforms:** Google Chrome (Chrome Extension)
- **Storage:** Chrome `storage.sync` for notes and settings
- **APIs:** Chrome Built-in AI APIs (Summarizer, Rewriter, Proofreader, Translator, Prompt API), Web Speech API (optional audio narration)
- **Other:** Canvas API (optional video generation), JSON (flashcards format)

## Getting Started
Follow these steps to install and use the ExplainIt.AI Chrome Extension:

1. Install the Extension
    Clone or download the GitHub repository:
git clone https://github.com/yourusername/explainit-ai.git
    Open Google Chrome.
    Go to `chrome://extensions/`.
    Enable **Developer mode** (top right corner).
    Click **Load unpacked** and select the project folder.

2. Using Text Selection Mode
    Open any webpage or PDF in Chrome.
    Highlight the text you want to understand.
    Right-click and select **“Explain with AI”**.
    The popup will show:
        - Simplified explanation
        - Summary of key points
        - Translation (if selected)
        - Buttons for **Read Aloud**

3. Audio Narration (Optional)
1. Click **Read Aloud** in the popup.
2. The AI will narrate the simplified explanation.

4. Offline Usage
- ExplainIt.AI runs locally on your device.
- AI processing works without an internet connection once the extension is installed.
- Notes and previous explanations are saved in Chrome `storage.sync` and persist across sessions.

5. Troubleshooting
- Make sure Chrome is updated to the latest version.
- If the extension does not appear, double-check **Developer mode** is enabled and the folder is loaded correctly.

## Demo
https://vimeo.com/1132689349?fl=ip&fe=ec


## Contributing
Contributions are welcome! Please fork the repository and submit pull requests.  


## License
This project is licensed under the **MIT License**.

**Note**: The extension was designed to use Chrome’s new Gemini Nano local AI model for summarization and simplification. However, since the API is still experimental and not fully functional in all Chrome versions, the demo uses a fallback to display how the system operates. Once Chrome fully enables local AI APIs, the summarization will run entirely on-device.
