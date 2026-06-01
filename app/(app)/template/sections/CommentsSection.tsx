import { Send } from "lucide-react";

export default function CommentsSection() {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h3 className="text-sm font-semibold text-foreground mb-4">Comments Section</h3>
        <div className="bg-white border border-border rounded-card shadow-card p-6">
          <div className="space-y-4 mb-6">
            {[
              { author: "Rajesh Kumar", time: "2 hours ago", text: "Please review the quantity before approving." },
              { author: "Priya Desai", time: "1 hour ago", text: "Quantity looks good! Approved for processing." },
            ].map((comment, idx) => (
              <div key={idx}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">{comment.author}</p>
                      <p className="text-xs text-muted-foreground">{comment.time}</p>
                    </div>
                    <p className="text-xs text-foreground mt-1">{comment.text}</p>
                  </div>
                </div>
                {idx === 0 && <div className="ml-11 flex gap-2 text-xs">
                  <button className="text-brand-600 hover:underline">Reply</button>
                  <button className="text-brand-600 hover:underline">Like</button>
                </div>}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4 border-t border-border">
            <div className="w-8 h-8 rounded-full bg-sage-100 flex-shrink-0" />
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-1 text-xs px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button className="p-2 hover:bg-muted rounded transition-colors">
                <Send className="w-4 h-4 text-brand-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Comments Pattern</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• User avatar for each comment</p>
          <p>• Author name and timestamp</p>
          <p>• Comment text content</p>
          <p>• Reply and like options</p>
          <p>• Input field for new comments</p>
        </div>
      </div>
    </div>
  );
}
