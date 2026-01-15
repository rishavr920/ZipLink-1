import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import UrlShortener from '../components/UrlShortener';

// Mock axios
vi.mock('axios');

describe('UrlShortener Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form', () => {
    render(<UrlShortener />);
    expect(screen.getByPlaceholderText(/paste url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /shorten url/i })).toBeInTheDocument();
  });

  it('should submit form with valid URL', async () => {
    const mockResponse = {
      data: {
        shortCode: 'abc123',
        shortUrl: 'http://localhost/abc123',
        qrCode: 'data:image/png;base64,test',
        originalUrl: 'https://example.com'
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);
    const user = userEvent.setup();

    render(<UrlShortener />);
    
    const input = screen.getByPlaceholderText(/paste url/i);
    const submitButton = screen.getByRole('button', { name: /shorten url/i });

    await user.type(input, 'https://example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/shorten'),
        { longUrl: 'https://example.com' }
      );
    });
  });

  it('should display error message on API failure', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        data: { error: 'Failed to shorten URL' }
      }
    });
    const user = userEvent.setup();

    render(<UrlShortener />);
    
    const input = screen.getByPlaceholderText(/paste url/i);
    const submitButton = screen.getByRole('button', { name: /shorten url/i });

    await user.type(input, 'https://example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to shorten url/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    axios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const user = userEvent.setup();

    render(<UrlShortener />);
    
    const input = screen.getByPlaceholderText(/paste url/i);
    const submitButton = screen.getByRole('button', { name: /shorten url/i });

    await user.type(input, 'https://example.com');
    await user.click(submitButton);

    expect(screen.getByText(/shortening/i)).toBeInTheDocument();
  });

  it('should handle password input', async () => {
    const mockResponse = {
      data: {
        shortCode: 'abc123',
        shortUrl: 'http://localhost/abc123',
        qrCode: 'data:image/png;base64,test',
        originalUrl: 'https://example.com',
        isPasswordProtected: true
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);
    const user = userEvent.setup();

    render(<UrlShortener />);
    
    const urlInput = screen.getByPlaceholderText(/paste url/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /shorten url/i });

    await user.type(urlInput, 'https://example.com');
    await user.type(passwordInput, 'mypassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/shorten'),
        expect.objectContaining({
          longUrl: 'https://example.com',
          password: 'mypassword'
        })
      );
    });
  });

  it('should handle one-time link checkbox', async () => {
    const mockResponse = {
      data: {
        shortCode: 'abc123',
        shortUrl: 'http://localhost/abc123',
        qrCode: 'data:image/png;base64,test',
        originalUrl: 'https://example.com',
        isOneTime: true
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);
    const user = userEvent.setup();

    render(<UrlShortener />);
    
    const urlInput = screen.getByPlaceholderText(/paste url/i);
    const checkbox = screen.getByLabelText(/one-time link/i);
    const submitButton = screen.getByRole('button', { name: /shorten url/i });

    await user.type(urlInput, 'https://example.com');
    await user.click(checkbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/shorten'),
        expect.objectContaining({
          longUrl: 'https://example.com',
          isOneTime: true
        })
      );
    });
  });

  it('should display shortened URL result', async () => {
    const mockResponse = {
      data: {
        shortCode: 'abc123',
        shortUrl: 'http://localhost/abc123',
        qrCode: 'data:image/png;base64,test',
        originalUrl: 'https://example.com'
      }
    };

    axios.post.mockResolvedValueOnce(mockResponse);
    const user = userEvent.setup();

    render(<UrlShortener />);
    
    const input = screen.getByPlaceholderText(/paste url/i);
    const submitButton = screen.getByRole('button', { name: /shorten url/i });

    await user.type(input, 'https://example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/abc123/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
    });
  });
});
