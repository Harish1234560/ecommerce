
export const isValidPhone = (v: string) => /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''));

export const isValidPincode = (v: string) => /^[1-9]\d{5}$/.test(v.trim());

export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
