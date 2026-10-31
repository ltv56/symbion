// Months in the default view
export const WINDOW = 6;

export const COLUMNS = {
  gridTemplateColumns: `repeat(${WINDOW}, minmax(0, 1fr))`,
};

// At most two characters
export const moreLabel = (count: number) => (count > 9 ? '9+' : `+${count}`);
