import PropTypes from "prop-types";

// A registry deck as the app holds it. wins/losses are the frozen legacy
// baseline (see AGENTS.md); live counts come from combineDeckStats.
export const DeckPropType = PropTypes.shape({
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  wins: PropTypes.number.isRequired,
  losses: PropTypes.number.isRequired,
});
