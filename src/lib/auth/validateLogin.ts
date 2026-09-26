const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LOGIN_PASSWORD_MIN = 6;
export const SIGNUP_NAME_MAX = 80;

export type LoginInput = {
	email: string;
	password: string;
};

export type SignupInput = LoginInput & {
	name: string;
};

export type LoginFieldErrors = {
	email?: string;
	password?: string;
};

export type SignupFieldErrors = LoginFieldErrors & {
	name?: string;
	confirmPassword?: string;
};

export type LoginValidation =
	| { ok: true; data: LoginInput }
	| { ok: false; errors: LoginFieldErrors };

export type SignupValidation =
	| { ok: true; data: SignupInput }
	| { ok: false; errors: SignupFieldErrors };

function validateEmailPassword(email: string, password: string): LoginFieldErrors {
	const errors: LoginFieldErrors = {};

	if (!email) {
		errors.email = 'Email is required';
	} else if (!EMAIL_PATTERN.test(email)) {
		errors.email = 'Enter a valid email';
	}

	if (!password) {
		errors.password = 'Password is required';
	} else if (password.length < LOGIN_PASSWORD_MIN) {
		errors.password = `Password must be at least ${LOGIN_PASSWORD_MIN} characters`;
	}

	return errors;
}

export function validateLogin(raw: {
	email?: string;
	password?: string;
}): LoginValidation {
	const email = (raw.email ?? '').trim();
	const password = raw.password ?? '';
	const errors = validateEmailPassword(email, password);

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors };
	}

	return { ok: true, data: { email, password } };
}

export function validateSignup(raw: {
	name?: string;
	email?: string;
	password?: string;
	confirmPassword?: string;
}): SignupValidation {
	const name = (raw.name ?? '').trim();
	const email = (raw.email ?? '').trim();
	const password = raw.password ?? '';
	const confirmPassword = raw.confirmPassword ?? '';
	const errors: SignupFieldErrors = validateEmailPassword(email, password);

	if (!name) {
		errors.name = 'Name is required';
	} else if (name.length > SIGNUP_NAME_MAX) {
		errors.name = `Name must be at most ${SIGNUP_NAME_MAX} characters`;
	}

	if (!confirmPassword) {
		errors.confirmPassword = 'Confirm your password';
	} else if (confirmPassword !== password) {
		errors.confirmPassword = 'Passwords must match';
	}

	if (Object.keys(errors).length > 0) {
		return { ok: false, errors };
	}

	return { ok: true, data: { name, email, password } };
}
