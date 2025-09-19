import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerCreationForm } from '@/components/admin/customer-creation-form';

// Mock the props
const mockProps = {
  onCustomerCreated: jest.fn(),
  onError: jest.fn(),
  onLoading: jest.fn(),
};

describe('CustomerCreationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with all fields', () => {
    render(<CustomerCreationForm {...mockProps} />);
    
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/servicem8 customer uuid/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
  });

  it('renders the auto-generate UUID button', () => {
    render(<CustomerCreationForm {...mockProps} />);
    
    const generateButton = screen.getByText(/generate uuid/i);
    expect(generateButton).toBeInTheDocument();
  });

  it('generates a UUID when the generate button is clicked', () => {
    render(<CustomerCreationForm {...mockProps} />);
    
    const uuidInput = screen.getByLabelText(/servicem8 customer uuid/i);
    const generateButton = screen.getByText(/generate uuid/i);
    
    // Initially empty
    expect(uuidInput).toHaveValue('');
    
    // Click generate button
    fireEvent.click(generateButton);
    
    // Should now have a UUID value
    expect(uuidInput).toHaveValue(expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
  });

  it('shows copy button when UUID is present', () => {
    render(<CustomerCreationForm {...mockProps} />);
    
    const uuidInput = screen.getByLabelText(/servicem8 customer uuid/i);
    const generateButton = screen.getByText(/generate uuid/i);
    
    // Initially no copy button
    expect(screen.queryByText(/copy/i)).not.toBeInTheDocument();
    
    // Generate UUID
    fireEvent.click(generateButton);
    
    // Copy button should now be visible
    expect(screen.getByText(/copy/i)).toBeInTheDocument();
  });

  it('validates required fields', () => {
    render(<CustomerCreationForm {...mockProps} />);
    
    const submitButton = screen.getByText(/create customer/i);
    
    // Try to submit without required fields
    fireEvent.click(submitButton);
    
    // Should show validation error for name
    expect(screen.getByText(/customer name is required/i)).toBeInTheDocument();
  });

  it('validates email format', () => {
    render(<CustomerCreationForm {...mockProps} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByText(/create customer/i);
    
    // Enter invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);
    
    // Should show validation error
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
  });
});
