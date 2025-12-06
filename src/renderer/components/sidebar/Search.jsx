import React, { useState } from 'react';
import { FiSearch, FiFile, FiX, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import './Search.css';

function Search({ workspaceFolder, onOpenFile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFiles, setExpandedFiles] = useState({});
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const performSearch = async () => {
    if (!searchQuery.trim() || !workspaceFolder) {
      setError('Please enter a search term');
      return;
    }

    setSearching(true);
    setError(null);
    setResults([]);

    try {
      // Use the file search API
      const searchResults = await window.electronAPI.searchInFiles({
        folder: workspaceFolder,
        query: searchQuery,
        caseSensitive,
        useRegex
      });

      if (searchResults.success) {
        setResults(searchResults.results);
        // Auto-expand all files
        const expanded = {};
        searchResults.results.forEach((file) => {
          expanded[file.filePath] = true;
        });
        setExpandedFiles(expanded);
      } else {
        setError(searchResults.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const toggleFileExpanded = (filePath) => {
    setExpandedFiles(prev => ({
      ...prev,
      [filePath]: !prev[filePath]
    }));
  };

  const handleMatchClick = (filePath, lineNumber) => {
    if (onOpenFile) {
      onOpenFile(filePath, lineNumber);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setError(null);
    setExpandedFiles({});
  };

  const totalMatches = results.reduce((sum, file) => sum + file.matches.length, 0);

  return (
    <div className="search-panel">
      <div className="search-header">
        <h3>SEARCH</h3>
      </div>

      <div className="search-content">
        <div className="search-input-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search in files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={clearSearch} title="Clear">
              <FiX size={14} />
            </button>
          )}
          <button
            className="search-button"
            onClick={performSearch}
            disabled={searching || !searchQuery.trim()}
            title="Search"
          >
            <FiSearch size={16} />
          </button>
        </div>

        <div className="search-options">
          <label className="search-option">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span>Match Case</span>
          </label>
          <label className="search-option">
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
            />
            <span>Use Regex</span>
          </label>
        </div>

        {searching && (
          <div className="search-status">
            <div className="spinner-small"></div>
            <span>Searching...</span>
          </div>
        )}

        {error && (
          <div className="search-error">
            <p>{error}</p>
          </div>
        )}

        {!searching && results.length > 0 && (
          <div className="search-results">
            <div className="results-summary">
              {totalMatches} result{totalMatches !== 1 ? 's' : ''} in {results.length} file{results.length !== 1 ? 's' : ''}
            </div>

            <div className="results-list">
              {results.map((fileResult) => (
                <div key={fileResult.filePath} className="result-file">
                  <div
                    className="result-file-header"
                    onClick={() => toggleFileExpanded(fileResult.filePath)}
                  >
                    {expandedFiles[fileResult.filePath] ? (
                      <FiChevronDown size={14} />
                    ) : (
                      <FiChevronRight size={14} />
                    )}
                    <FiFile size={14} />
                    <span className="file-name">{fileResult.fileName}</span>
                    <span className="match-count">{fileResult.matches.length}</span>
                  </div>

                  {expandedFiles[fileResult.filePath] && (
                    <div className="result-matches">
                      {fileResult.matches.map((match, idx) => (
                        <div
                          key={idx}
                          className="result-match"
                          onClick={() => handleMatchClick(fileResult.filePath, match.line)}
                        >
                          <span className="line-number">{match.line}</span>
                          <span className="match-text" dangerouslySetInnerHTML={{ __html: match.preview }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!searching && searchQuery && results.length === 0 && !error && (
          <div className="search-empty">
            <FiSearch size={48} />
            <p>No results found</p>
            <span>Try a different search term</span>
          </div>
        )}

        {!searching && !searchQuery && results.length === 0 && !error && (
          <div className="search-empty">
            <FiSearch size={48} />
            <p>Search in Workspace</p>
            <span>Enter a search term to find text in your files</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Search; 
