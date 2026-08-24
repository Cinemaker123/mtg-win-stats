import PropTypes from "prop-types";
import d20Image from "../assets/D20_icon.png";
import styles from './D20.module.css';

/**
 * D20 die display component with number overlay
 * @param {Object} props
 * @param {number} props.number - The number to display (1-20)
 * @param {boolean} props.showResult - Whether to show the number or "?"
 */
export function D20({ number, showResult }) {
  return (
    <div className={styles.container}>
      <img 
        src={d20Image} 
        alt="D20" 
        width={130} 
        height={130}
        className={styles.dieImage}
      />
      {/* Number overlay. data-roll picks the colours out of D20.module.css:
          a natural 20 is gold, a natural 1 is ink, anything else is neutral. */}
      <div
        className={styles.overlay}
        data-roll={showResult ? (number === 20 ? "crit" : number === 1 ? "fumble" : "plain") : "hidden"}
      >
        <span
          className={styles.number}
          style={{ fontSize: showResult ? "29px" : "41px" }}
        >
          {showResult ? number : "?"}
        </span>
      </div>
    </div>
  );
}

D20.propTypes = {
  number: PropTypes.number.isRequired,
  showResult: PropTypes.bool.isRequired,
};
