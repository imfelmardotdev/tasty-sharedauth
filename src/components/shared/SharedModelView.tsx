import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import TOTPDisplay from "../models/TOTPDisplay";
import { CircularProgress } from "@/components/ui/circular-progress";
import { getTimeRemaining } from "@/lib/utils/totp";
import { Model } from "@/lib/db/types";

const SharedModelView = () => {
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get("token");

  useEffect(() => {
    // Update the timer every second
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const validateAndFetchModel = async () => {
      if (!id || !token) {
        setError("Invalid share link");
        setLoading(false);
        return;
      }

      try {
        // First validate the share link
        const { data: shareLink, error: shareLinkError } = await supabase
          .from("shared_model_links")
          .select("*")
          .eq("model_id", id)
          .eq("access_token", token)
          .single();

        if (shareLinkError || !shareLink) {
          throw new Error("Invalid or expired share link");
        }

        // Check if link has expired
        if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
          throw new Error("Share link has expired");
        }

        // Check if one-time view is enabled and already viewed
        if (shareLink.one_time_view && shareLink.views_count > 0) {
          throw new Error("This share link has already been used");
        }

        // Check email restriction if applicable
        if (shareLink.access_type === "restricted") {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user?.email || !shareLink.allowed_emails?.includes(user.email.toLowerCase())) {
            throw new Error("You don't have permission to view this model");
          }
        }

        // Fetch the model
        const { data: modelData, error: modelError } = await supabase
          .from("models")
          .select("*")
          .eq("id", id)
          .single();

        if (modelError || !modelData) {
          throw new Error("Model not found");
        }

        // Update view count
        await supabase
          .from("shared_model_links")
          .update({ views_count: shareLink.views_count + 1 })
          .eq("id", shareLink.id);

        setModel(modelData);
      } catch (err) {
        console.error("Error loading shared model:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    validateAndFetchModel();
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-500 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Model Not Found</h2>
          <p className="text-gray-600">The requested model could not be found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6">
          <h1 className="text-2xl font-semibold mb-6">{model.name}</h1>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Username</h3>
              <p className="mt-1">{model.username}</p>
            </div>

            {model.totp_secret && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">2FA Code</h3>
                <div className="mt-1 flex items-center gap-4">
                  <TOTPDisplay 
                    secret={model.totp_secret}
                    modelId={model.id}
                  />
                  <div className="relative">
                    <CircularProgress 
                      value={(timeRemaining / 30) * 100} 
                      className="h-8 w-8 text-primary"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {timeRemaining}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {model.link && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Link</h3>
                <a
                  href={model.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-blue-500 hover:underline block"
                >
                  {model.link}
                </a>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SharedModelView;
